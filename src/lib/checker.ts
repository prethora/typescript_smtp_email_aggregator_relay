import { aggregator } from "./aggregator";
import { config } from "./config";
import { logger } from "./logger";

class Checker
{
    start()
    {
        const next = () => 
        {
            logger.debug(`CHECKER adding check`);
            aggregator.addCheck(() => 
            {
                logger.debug(`CHECKER scheduling next check`);
                setTimeout(next,config.aggregate.checkExpiryEverySeconds*1000)
            });
        };          
        next();
    }
}

export const checker = new Checker();