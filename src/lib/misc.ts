import crypto from "crypto";
import { Stream } from "stream";
import { createWriteStream, readFile } from "fs-extra";

export const generateRandomKey = () => 
{
    return crypto.randomBytes(20).toString("hex");
};

export const streamToString = async (stream: Stream) => 
{
    const chunks: Buffer[] = [];
    return new Promise<string>((resolve, reject) => 
    {
        stream.on("data",(chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error",(err) => reject(err));
        stream.on("end",() => resolve(Buffer.concat(chunks).toString("utf8")));
    });
};

export const streamToFile = async (stream: Stream,outputFilePath: string) => 
{
    return new Promise<void>((resolve,reject) => 
    {
        const fstream = createWriteStream(outputFilePath);
        stream.pipe(fstream);
        stream.on("error",reject);
        fstream.on("close",resolve);
    });
};

export const sha1Hash = (value: string,limitLength = -1) =>
{
    const shasum = crypto.createHash("sha1");
    shasum.update(value);
    let ret = shasum.digest("hex");
    if (limitLength>=0) ret = ret.substr(0,limitLength);
    return ret;
};

export async function safeReadFile(filePath: string,encoding: string): Promise<String | null>;
export async function safeReadFile(filePath: string): Promise<Buffer | null>;
export async function safeReadFile(filePath: string,encoding?: string): Promise<String | Buffer | null>
{
    try
    {
        if (encoding)
        {
            return await readFile(filePath,encoding);
        }
        else
        {
            return await readFile(filePath);
        }        
    }
    catch(err)
    {
        return null;
    }    
};