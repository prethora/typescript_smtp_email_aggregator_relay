import { readFileSync } from "fs";
import { configPath } from "./paths";
import YAML from "yaml";
import { TConfig } from "./all_types";

export let config: TConfig;
try
{
    config = YAML.parse(readFileSync(configPath,"utf8"));
}
catch(err)
{    
}