import { TMessageHeader } from "./all_types";
import { Stream } from "stream";
import { queuePath } from "./paths";
import { join } from "path";
import { generateRandomKey } from "./misc";
import { ensureDir, writeFile, createWriteStream,move } from "fs-extra";
import { config } from "./config";
import { Jobs } from "./jobs";
import { RawMessage } from "./rawmessage";
import { sender } from "./sender";
import { logger } from "./logger";

interface ResolveQueueItem
{
    resolve: (rawmessage: RawMessage | PromiseLike<RawMessage>) => void;
    index: number;
}

class SendQueue
{
    currentQueue: Jobs = new Jobs();

    isPolling = false;
    pollingQueue: ResolveQueueItem[] = [];

    failedCount = 0;
    isPaused = false;    
    pausedTimeout?: NodeJS.Timeout;
    pauseQueue: ResolveQueueItem[] = [];

    async add(header: TMessageHeader,body: string | Buffer | Stream)
    {
        const key = generateRandomKey();
        const prePath = join(queuePath,`__${key}__`);
        const finalPath = join(queuePath,key);
        const headerPath = join(prePath,"header");
        const bodyPath = join(prePath,"body");
        await ensureDir(prePath);
        await writeFile(headerPath,JSON.stringify(header,null,2));
        if (body instanceof Stream)
        {
            const wstream = createWriteStream(bodyPath);
            await new Promise<void>((resolve,reject) => 
            {
                body.pipe(wstream);
                wstream.on("error",reject);
                wstream.on("close",resolve);
            });            
        }
        else
        {
            await writeFile(bodyPath,body);
        }      
        await move(prePath,finalPath);
    }

    async getJob(index: number)
    {
        if (this.isPaused)
        {            
            return new Promise<RawMessage>((resolve) => 
            {
                logger.debug(`SEND-QUEUE ${index}: is paused, adding resolve to pause queue`);
                this.pauseQueue.push({resolve,index});
            });
        }

        if (this.isPolling)
        {            
            return new Promise<RawMessage>((resolve) => 
            {
                logger.debug(`SEND-QUEUE ${index}: is polling, adding resolve to polling queue`);
                this.pollingQueue.push({resolve,index});
            });
        }

        const job = this.currentQueue.items.shift();
        if (job)
        {
            logger.debug(`SEND-QUEUE ${index}: job found directly`);
            return job;
        }
        else
        {
            logger.debug(`SEND-QUEUE ${index}: entering polling state`);
            this.isPolling = true;
            return await new Promise<RawMessage>((resolve) => 
            {
                logger.debug(`SEND-QUEUE ${index}: adding main resolve to polling queue`);
                this.pollingQueue.push({resolve,index});
                const next = async () => 
                {                    
                    this.currentQueue = await Jobs.load();
                    if (this.currentQueue.items.length>0)
                    {
                        logger.debug(`SEND-QUEUE ${index}: polling found ${this.currentQueue.items.length} jobs, blocking all`);
                        for(let i=0;i<this.currentQueue.items.length;i++)
                        {
                            const rawmessage = this.currentQueue.items[i];
                            await rawmessage.loadSimulatedErrorCount();
                            rawmessage.block();
                        }
                        // this.currentQueue.items.forEach((rawmessage) => rawmessage.block());
                        this.clearPollingState(index);
                    }
                    else
                    {
                        logger.debug(`SEND-QUEUE ${index}: job not found, polling, waiting ${config.sendQueue.pollIntervalSeconds} seconds`);
                        setTimeout(next,config.sendQueue.pollIntervalSeconds*1000);
                    }
                };
                logger.debug(`SEND-QUEUE ${index}: job not found, polling`);
                next();
            });            
        }
    }

    clearPauseState(index: number)
    {
        this.failedCount = 0;
        logger.debug(`SEND-QUEUE ${index}: clearing pause state`);
        if (this.isPaused)
        {
            logger.debug(`SEND-QUEUE ${index}: clearing pause state: is actually paused`);
            if (this.pausedTimeout)
            {
                clearTimeout(this.pausedTimeout);
                this.pausedTimeout = undefined;
            }
            this.isPaused = false;
            const pauseQueue = [...this.pauseQueue];
            this.pauseQueue.length = 0;
            logger.debug(`SEND-QUEUE ${index}: clearing pause state: pause queue length: ${pauseQueue.length}, restoring}`);
            pauseQueue.forEach(({resolve,index}) => 
            {
                this.getJob(index).then(resolve);
            });
        }
    }

    clearPollingState(index: number)
    {
        logger.debug(`SEND-QUEUE ${index}: clearing polling state`);
        if (this.isPolling)
        {
            logger.debug(`SEND-QUEUE ${index}: clearing polling state: is actually polling`);
            this.isPolling = false;
            const pollingQueue = [...this.pollingQueue];
            this.pollingQueue.length = 0;
            logger.debug(`SEND-QUEUE ${index}: clearing polling state: polling queue length: ${pollingQueue.length}, restoring}`);
            pollingQueue.forEach(({resolve,index}) => 
            {
                this.getJob(index).then(resolve);
            });
        }
    }

    reportSuccess(index: number,to: string)
    {
        logger.debug(`SEND-QUEUE ${index}: email sent to: ${to}`);
        logger.info(`email sent to: ${to}`);
        this.clearPauseState(index);
    }

    reportError(index: number,rawmessage: RawMessage,message: string,id: string)
    {        
        logger.debug(`SEND-QUEUE ${index}: unable to send message with id: ${id}; failed with message: ${message}`);
        logger.error(`unable to send message with id: ${id}; failed with message: ${message}`);
        this.currentQueue.items.push(rawmessage);
        this.failedCount++;
        if (this.failedCount===config.sendQueue.failure.retries)
        {            
            logger.debug(`SEND-QUEUE ${index}: initiating failure pause, failedCount: ${this.failedCount}, for: ${config.sendQueue.failure.pauseMinutes} minute(s)`);
            this.isPaused = true;
            this.pausedTimeout = setTimeout(
                () => this.clearPauseState(index),
                config.sendQueue.failure.pauseMinutes*60*1000
            );
        }
    }

    async thread(index: number)
    {
        while(true)
        {
            const rawmessage = await this.getJob(index);
            logger.debug(`SEND-QUEUE ${index}: thread got a job with id: ${rawmessage.id}`);
            const envelope = await rawmessage.getHeader();
            if (envelope!==null)
            {
                logger.debug(`SEND-QUEUE ${index}: thread job with id: ${rawmessage.id}, parsed successfully`);
                const mailOptions = {
                    envelope,
                    raw: {
                        path: rawmessage.bodyFilePath
                    }
                };
                try
                {
                    if (rawmessage.simulatedErrorCount>0)
                    {
                        rawmessage.simulatedErrorCount--;
                        throw new Error("simulated error thrown");
                    }
                    await sender.sendMail(mailOptions);                    
                    await rawmessage.remove();
                    logger.debug(`SEND-QUEUE ${index}: thread job with id: ${rawmessage.id}, removed`);
                    this.reportSuccess(index,envelope.to);
                }
                catch(err: any)
                {
                    this.reportError(index,rawmessage,err.message,rawmessage.id);
                }
            }
            else
            {
                this.reportError(index,rawmessage,"unexpected error: unable to parse rawmessage header",rawmessage.id);
            }
        }
    }

    async start()
    {
        logger.debug(`SEND-QUEUE unblocking any previously blocked raw messages`);
        await Jobs.unblockAll();
        logger.debug(`SEND-QUEUE starting queue with ${config.sendQueue.threads} threads`);
        for(let i=0;i<config.sendQueue.threads;i++) this.thread(i);
    }
}

export const sendQueue = new SendQueue();