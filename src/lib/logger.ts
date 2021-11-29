import { createLogger,transports,format, transport } from "winston";
import * as Transport from 'winston-transport';
const { combine,prettyPrint,timestamp } = format;
import { config } from "./config";
import { dirname } from "path";
import { ensureDirSync } from "fs-extra";

const configTransports: Transport[] = [];
const debugConfigTransports: Transport[] = [];

if ((config.logging.combined.on) && (config.logging.combined.file))
{
    ensureDirSync(dirname(config.logging.combined.file));
    configTransports.push(new transports.File({filename: config.logging.combined.file}));
}

if ((config.logging.errors.on) && (config.logging.errors.file))
{
    ensureDirSync(dirname(config.logging.errors.file));
    configTransports.push(new transports.File({filename: config.logging.errors.file,level: "error"}));
}

if ((process.env.NODE_ENV!=="production") && (config.logging.debug.file))
{
    ensureDirSync(dirname(config.logging.debug.file));
    debugConfigTransports.push(new transports.File({filename: config.logging.debug.file}));
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