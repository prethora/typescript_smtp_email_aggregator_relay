import MailComposer from "nodemailer/lib/mail-composer";
import { Stream } from "stream";
import { TEmailType, TMessageHeader } from "./all_types";
import { safeReadFile, streamToString } from "./misc";
import { ParsedMail, simpleParser } from "mailparser";
import { logger } from "./logger";
import { Waiting } from "./waiting";
import { config } from "./config";
import Mail, { Address } from "nodemailer/lib/mailer";
import { packagePath } from "./paths";
import { join } from "path";
import { sendQueue } from "./send_queue";
import { writeFile } from "fs-extra";

class Aggregator
{
    queue: (() => PromiseLike<void>)[] = [];
    jobActive = false;

    addMessage(header: TMessageHeader,body: Stream)
    {
        this.queue.push(async () =>
        {            
            const invoiceSearch = "Please find attached your latest invoices from";
            const statementSearch = "Please find attached your latest statement from";
            const rawbody = await streamToString(body);
            let mail: ParsedMail;

            logger.debug(`AGGREGATOR parsing message`);

            try
            {
                mail = await simpleParser(rawbody);

                logger.debug(`AGGREGATOR parsed successfully`);
            }
            catch(err)
            {
                logger.debug(`AGGREGATOR received a corrupted message`);

                logger.error("received a corrupted message");
                return;
            }

            mail.text = mail.text || "";

            const extractName = () =>
            {
                const firstLine = mail.text!.split("\n")[0].trim();
                const res = /^Dear\s+([\s\S]+),$/.exec(firstLine);
                if (res)
                {
                    return res[1];
                }
                else
                {
                    return null;
                }
            };
            if ((mail.text.indexOf(invoiceSearch)!==-1) || (mail.text.indexOf(statementSearch)!==-1))
            {                    
                const type: TEmailType = (mail.text.indexOf(invoiceSearch)!==-1)?"invoice":"statement";
                const reverseType: TEmailType = (type==="invoice")?"statement":"invoice";

                logger.debug(`AGGREGATOR message type is '${type}', reverse type is '${reverseType}'`);

                const name = extractName();
                if (name)
                {
                    logger.debug(`AGGREGATOR message extracted name is '${name}'`);

                    const waiting = new Waiting(
                        header.from,
                        header.to,
                        name,
                        (mail.from && (mail.from.value.length>0))?
                            mail.from.value[0]:
                            {address: header.from,name: ""}
                    );
                    await waiting.writeHeader();

                    logger.debug(`AGGREGATOR created/loaded waiting with key: ${waiting.key}`);

                    const matches = (await waiting.loadAllMessages()).filter(({type}) => type===reverseType);

                    logger.debug(`AGGREGATOR loaded existing potential matches: ${matches.length}`);

                    if (matches.length>0)
                    {
                        logger.debug(`AGGREGATOR match found, about to aggregate`);

                        const match = matches[0];
                        const matchMail = await match.parseRaw();
                        const bodyFilePath = join(packagePath,config.aggregate.bodyFile);
                        let bodyText = (await safeReadFile(bodyFilePath,"utf8")) || "";
                        if (bodyText==="") logger.error("config.aggregate.bodyFile is pointing to a non-existing file or an empty file - sending email with empty body");

                        const attachments: Mail.Attachment[] = [];

                        if (type==="invoice")
                        {
                            attachments.push(...(mail.attachments.map(({filename,content}) => ({filename,content}))));
                            attachments.push(...(matchMail.attachments.map(({filename,content}) => ({filename,content}))));
                        }
                        else
                        {                                    
                            attachments.push(...(matchMail.attachments.map(({filename,content}) => ({filename,content}))));
                            attachments.push(...(mail.attachments.map(({filename,content}) => ({filename,content}))));
                        }

                        const composer = new MailComposer({
                            from: waiting.fromAddress as Address,
                            to: waiting.to,
                            subject: config.aggregate.subject.split("{name}").join(waiting.name),
                            text: bodyText.split("{name}").join(waiting.name),
                            attachments                                
                        });

                        logger.debug(`AGGREGATOR raw mail body composed`);
                
                        await sendQueue.add(header,composer.compile().createReadStream());
                        await match.remove();

                        logger.debug(`AGGREGATOR forwarded to send queue and removed match with key: ${match.key}`);
                    }
                    else
                    {                            
                        const message = await waiting.createMessage(type);
                        await writeFile(message.rawFilePath,rawbody);

                        logger.debug(`AGGREGATOR no matched found, stored message with key: ${message.key}`);
                    }
                }
                else
                {
                    logger.debug(`AGGREGATOR received an invalid message (could not extract name) addressed to ${mail.to}, with subject: ${mail.subject}`);

                    logger.error(`received an invalid message (could not extract name) addressed to ${mail.to}, with subject: ${mail.subject}`);
                }
            }
            else
            {
                logger.debug(`AGGREGATOR message has no type, forwarding to send queue`);

                await sendQueue.add(header,rawbody);
            }
        });  
        this.processQueue();
    }

    addCheck(callback?: () => void)
    {        
        this.queue.push(async () =>
        {
            const clients = await Waiting.loadAll();

            logger.debug(`AGGREGATOR performing client check, found clients: ${clients.length}`);

            for(let i=0;i<clients.length;i++)
            {
                const messages = await clients[i].loadAllMessages();

                logger.debug(`AGGREGATOR performing messages check, for client[${i}]: found messages: ${messages.length}`);

                for(let j=0;j<messages.length;j++)
                {
                    const message = messages[j];
                    if (message.hasExpired())
                    {

                        logger.debug(`AGGREGATOR client[${i}] message[${j}] has expired, forwarding and removing`);

                        await message.forwardAndRemove();
                    }
                }                
            }

            logger.debug(`AGGREGATOR check complete`);

            if (callback) callback();
        });
        this.processQueue();
    }

    async processQueue()
    {
        if (this.jobActive) return;

        const job = this.queue.shift();
        if (job)
        {
            this.jobActive = true;
            await job();
            this.jobActive = false;
            this.processQueue();
        }
    }
}

export const aggregator = new Aggregator();