import { resolve } from "path";
import { ensureDirSync } from "fs-extra";

export const packagePath = resolve(__dirname,"..","..");
export const configPath = resolve(packagePath,"config.yaml");
export const rawmessagePath = resolve(packagePath,"rawmessage");
export const dataPath = resolve(packagePath,"data");
export const queuePath = resolve(dataPath,"queue");
export const waitingPath = resolve(dataPath,"waiting");
ensureDirSync(queuePath);
ensureDirSync(waitingPath);
