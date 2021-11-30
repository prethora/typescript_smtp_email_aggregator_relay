import { join } from "path";
import { readFileSync } from "fs";
import { configPath, packagePath } from "./paths";
import YAML from "yaml";
import { TConfig } from "./all_types";
import { safeReadFile } from "./misc";

export let config: TConfig;
try
{
    config = YAML.parse(readFileSync(configPath,"utf8"));
}
catch(err)
{    
}

export const configSanityCheck = async () => 
{
    if (config.aggregate.subject.indexOf("{name}")===-1) return false;
    const bodyText = (await safeReadFile(join(packagePath,config.aggregate.bodyFile),"utf8")) || "";
    if (bodyText.indexOf("{name}")===-1) return false;    
    return true;
};