import { createLogger,transports,format, transport } from "winston";
import * as Transport from 'winston-transport';
const { combine,prettyPrint,timestamp } = format;
import { config } from "./config";
import { dirname,join } from "path";
import { ensureDirSync } from "fs-extra";
import { packagePath } from "./paths";

const configTransports: Transport[] = [];
const debugConfigTransports: Transport[] = [];

if ((config.logging.combined.on) && (config.logging.combined.file))
{
    const logFilePath = join(packagePath,config.logging.combined.file);
    ensureDirSync(dirname(logFilePath));
    configTransports.push(new transports.File({filename: logFilePath}));
}

if ((config.logging.errors.on) && (config.logging.errors.file))
{
    const logFilePath = join(packagePath,config.logging.errors.file);
    ensureDirSync(dirname(logFilePath));
    configTransports.push(new transports.File({filename: logFilePath,level: "error"}));
}

if ((config.logging.debug.on) && (config.logging.debug.file))
{
    const logFilePath = join(packagePath,config.logging.debug.file);
    ensureDirSync(dirname(logFilePath));
    debugConfigTransports.push(new transports.File({filename: logFilePath}));
}

if (process.env.NODE_ENV!=="production")
{
    debugConfigTransports.push(new transports.Console());
}

const _logger = createLogger({
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: configTransports
});

const _debugLogger = createLogger({
    transports: debugConfigTransports
});

export const logger = {
    info(message: string)
    {
        if (configTransports.length>0) _logger.info(message);
    },
    error(message: string)
    {
        if (configTransports.length>0) _logger.error(message);        
    },
    debug(message: string)
    {
        if (debugConfigTransports.length>0) _debugLogger.info(message);
    }
};