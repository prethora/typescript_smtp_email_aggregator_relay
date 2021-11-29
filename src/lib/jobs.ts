import { RawMessage } from "./rawmessage";
import { queuePath } from "./paths";
import { readdir,stat,move } from "fs-extra";
import { join } from "path";

export class Jobs
{
    items: RawMessage[] = [];
    
    static async load()
    {
        const ret = new Jobs();
        const entities = await readdir(queuePath);
        for(let i=0;i<entities.length;i++)
        {
            const entity = entities[i];
            if (((await stat(join(queuePath,entity))).isDirectory()) && (/^[0-9a-f]{40}$/.test(entity)))
            {
                ret.items.push(new RawMessage(entity));
            }
        }
        return ret;
    }

    static async unblockAll()
    {
        const entities = await readdir(queuePath);
        for(let i=0;i<entities.length;i++)
        {
            const entity = entities[i];
            if (((await stat(join(queuePath,entity))).isDirectory()) && (/^__[0-9a-f]{40}__$/.test(entity)))
            {
                const id = entity.substr(2,entity.length-4);
                const fromDir = join(queuePath,entity);
                const toDir = join(queuePath,id);
                await move(fromDir,toDir);
            }
        }
    }
}