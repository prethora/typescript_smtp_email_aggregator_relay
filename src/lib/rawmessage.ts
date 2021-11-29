import { join } from "path";
import { queuePath } from "./paths";
import { moveSync, readFile,rm } from "fs-extra";
import { TMessageHeader } from "./all_types";

export class RawMessage
{
    id: string;
    isBlocked = false;
    simulatedErrorCount = 0;

    constructor(id: string)
    {
        this.id = id;
    }
    
    get headerFilePath()
    {
        const dirPath = this.getDirPath();
        return join(dirPath,"header");
    }

    get bodyFilePath()
    {
        const dirPath = this.getDirPath();
        return join(dirPath,"body");
    }

    async loadSimulatedErrorCount()
    {
        // const res = await this.getHeader();
        // this.simulatedErrorCount = res?(res.simulateErrorCount?res.simulateErrorCount:0):0;
    }

    getDirPath()
    {
        return this.isBlocked?this.getBlockedDirPath():this.getReadyDirPath();
    }

    getReadyDirPath()
    {
        return join(queuePath,this.id);
    }

    getBlockedDirPath()
    {
        return join(queuePath,"__"+this.id+"__");
    }

    block()
    {
        if (this.isBlocked) throw new Error("rawmessage is already blocked, cannot block");
        moveSync(this.getReadyDirPath(),this.getBlockedDirPath());
        this.isBlocked = true;
    }

    async getHeader()
    {
        try
        {
            return JSON.parse(await readFile(this.headerFilePath,"utf8")) as TMessageHeader;
        }
        catch(err)
        {
            return null;
        }        
    }

    async remove()
    {
        const dirPath = this.getDirPath();
        await rm(dirPath,{recursive: true});
    }
}