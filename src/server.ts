import { SMTPServer } from "smtp-server";
import { config } from "./lib/config";
import { aggregator } from "./lib/aggregator";
import { sendQueue } from "./lib/send_queue";
import { checker } from "./lib/checker";
import { logger } from "./lib/logger";

const incomingServer = new SMTPServer({
    async onData(stream,session,callback) 
    {
        const from = (session.envelope.mailFrom)?session.envelope.mailFrom.address:"";
        const to = session.envelope.rcptTo.map(({address}) => address).join(",");

        logger.debug(`SERVER received and adding message with header: ${JSON.stringify({from,to})}`);

        aggregator.addMessage({from,to},stream);
        callback();
    },
    authOptional: true,
    hideSTARTTLS: true
});

logger.debug(`SERVER starting incoming server`);

incomingServer.listen(config.incoming.port,"0.0.0.0",() => 
{
    console.log(`incoming smtp server listening on port ${config.incoming.port}`);
});

logger.debug(`SERVER starting send queue`);

sendQueue.start();

logger.debug(`SERVER starting expiry checker`);

checker.start();