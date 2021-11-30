import { SMTPServer } from "smtp-server";
import { config, configSanityCheck } from "../src/lib/config";
import { logger } from "../src/lib/logger";
import { simpleParser } from "mailparser";
import { sender } from "../src/lib/sender";
import { streamToString } from "../src/lib/misc";

export const run = async () => 
{
    if (!await configSanityCheck())
    {
        const errorMessage = "config.aggregate.subject and/or config.aggregate.bodyFile do not contain the {name} tag, refusing to start test";
        logger.error(errorMessage);
        console.log(`error: ${errorMessage}`);
        return;
    }

    const incomingServer = new SMTPServer({
        async onData(stream,session,callback) 
        {
            const rawbody = await streamToString(stream);
            const mail = await simpleParser(rawbody);
            const sep = "-------------------------------------------";
            const short_sep = "------------------------";

            const from = session.envelope.mailFrom?session.envelope.mailFrom.address:"";
            const to = session.envelope.rcptTo.map(({address}) => address);

            console.log(sep);
            console.log("INCOMING MESSAGE");
            console.log(sep);            
            console.log(`from: ${from}`);
            console.log(`to: ${to.join(",")}`);
            console.log(`subject: ${mail.subject}`);
            console.log(`body:`);
            console.log(short_sep);
            console.log(mail.text?mail.text.trim():"");            
            if (mail.attachments.length>0)
            {
                console.log(short_sep);
                console.log(`attachments:`);
                console.log(short_sep);
                console.log(mail.attachments.map(({filename}) => "-"+filename).join("\n"));
                console.log(short_sep);
            }
            console.log(sep);
            console.log();

            const mailOptions = {
                envelope: { from,to },
                raw: rawbody
            };

            console.log(sep);

            callback();
            
            try
            {
                await sender.sendMail(mailOptions);
                console.log("SUCCESS: email forwarded to smtp server");
            }
            catch(err: any)
            {
                console.log(`ERROR: forwarding to smtp server failed: ${err.message}`);
            }
            console.log(sep);
            console.log();            

            
        },
        authOptional: true,
        hideSTARTTLS: true
    });
        
    incomingServer.listen(config.incoming.port,config.incoming.host,() => 
    {
        console.log(`incoming smtp server listening on port ${config.incoming.host}:${config.incoming.port}`);
        console.log();
    });    
};

run();