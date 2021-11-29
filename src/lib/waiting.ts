import { generateRandomKey, sha1Hash } from "./misc";
import { waitingPath } from "./paths";
import { join } from "path";
import { stat, readdir, ensureDir, writeFile, readFile, rm } from "fs-extra";
import { TEmailFromAddress, TEmailType } from "./all_types";
import { config } from "./config";
import { simpleParser } from "mailparser";
import { createReadStream } from "fs";
import { sendQueue } from "./send_queue";

export class Waiting
{
    from: string;
    to: string;
    name: string;
    fromAddress: TEmailFromAddress;
    key: string;

    constructor(from: string,to: string,name: string,fromAddress: TEmailFromAddress)
    {
        this.from = from;
        this.to = to;
        this.name = name;
        this.fromAddress = fromAddress;
        this.key = this.calcKey();
    }

    get dirPath()
    {
        return join(waitingPath,this.key);
    }

    get headerFilePath()
    {
        return join(this.dirPath,"header");
    }

    async ensureDirPath()
    {
        await ensureDir(this.dirPath);
    }

    async writeHeader()
    {
        const { from,to,name,fromAddress } = this;
        await this.ensureDirPath();
        await writeFile(this.headerFilePath,JSON.stringify({ from,to,name,fromAddress }));
    }

    async readHeader()
    {
        const { from,to,name,fromAddress } = JSON.parse(await readFile(this.headerFilePath,"utf8"));
        this.from = from;
        this.to = to;
        this.name = name;
        this.fromAddress = fromAddress;
    }

    calcKey()
    {
        const { from,to,name } = this;
        return sha1Hash([from.toLowerCase().trim(),to.toLowerCase().trim(),name.toLowerCase().trim()].join("<-->"),40);
    }

    async createMessage(type: TEmailType)
    {
        const ret = new WaitingMessage(this,type);
        await ret.writeHeader();
        return ret;
    }

    async loadMessage(key: string)
    {
        const ret = new WaitingMessage(this,"invoice");
        ret.key = key;
        await ret.readHeader();
        return ret;
    }

    async loadAllMessages()
    {
        const ret: WaitingMessage[] = [];
        const entities = await readdir(this.dirPath);

        for(let i=0;i<entities.length;i++)
        {
            const entity = entities[i];
            if (((await stat(join(this.dirPath,entity))).isDirectory()) && (/^[0-9a-f]{40}$/.test(entity)))
            {
                ret.push(await this.loadMessage(entity));
            }
        }

        return ret;
    }

    static async load(key: string)
    {
        const ret = new Waiting("","","",{address: "",name: ""});
        ret.key = key;
        await ret.readHeader();
        return ret;
    }

    static async loadAll()
    {        
        const ret: Waiting[] = [];
        const entities = await readdir(waitingPath);

        for(let i=0;i<entities.length;i++)
        {
            const entity = entities[i];
            if (((await stat(join(waitingPath,entity))).isDirectory()) && (/^[0-9a-f]{40}$/.test(entity)))
            {
                ret.push(await Waiting.load(entity));
            }
        }

        return ret;
    }
}

export class WaitingMessage
{
    parent: Waiting;
    key: string;
    timestamp: number;
    type: TEmailType;
    
    constructor(parent: Waiting,type: TEmailType)
    {
        this.parent = parent;
        this.key = generateRandomKey();
        this.timestamp = (new Date()).getTime();
        this.type = type;
    }

    get dirPath()
    {
        return join(this.parent.dirPath,this.key);
    }

    get rawFilePath()
    {
        return join(this.dirPath,"raw.mail");
    }

    get headerFilePath()
    {
        return join(this.dirPath,"header");
    }

    async parseRaw()
    {        
        return await simpleParser(createReadStream(this.rawFilePath));
    }

    async ensureDirPath()
    {
        await ensureDir(this.dirPath);
    }

    async writeHeader()
    {
        const { timestamp,type } = this;
        await this.ensureDirPath();
        await writeFile(this.headerFilePath,JSON.stringify({ timestamp,type }));
    }

    async readHeader()
    {
        const { timestamp,type,attachments } = JSON.parse(await readFile(this.headerFilePath,"utf8"));
        this.timestamp = timestamp;
        this.type = type;
    }

    hasExpired()
    {
        const elapsed = (new Date()).getTime()-this.timestamp;
        const waitForUpTo = (config.aggregate.waitForUpToMinutes*60*1000);
        return elapsed>=waitForUpTo;
    }

    async remove()
    {
        await rm(this.dirPath,{recursive: true});
    }

    async forwardAndRemove()
    {
        const { from,to } = this.parent;
        await sendQueue.add({from,to},createReadStream(this.rawFilePath));
        await this.remove();
    }
}