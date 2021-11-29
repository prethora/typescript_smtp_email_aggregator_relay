import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import winston from "winston";
const { combine, timestamp, label, prettyPrint } = winston.format;

import { config } from "./lib/config";
import { sendQueue } from "./lib/send_queue";
import { createReadStream } from "fs";
import { packagePath, rawmessagePath } from "./lib/paths";
import { Jobs } from "./lib/jobs";
import { readFile, readFileSync,writeFile,writeFileSync } from "fs-extra";
import { logger } from "./lib/logger";
import { sender } from "./lib/sender";
import { aggregator } from "./lib/aggregator";
import { Waiting } from "./lib/waiting";
import MailComposer from "nodemailer/lib/mail-composer";

const smtpConfig = {
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true, // use SSL
    auth: {
        user: "domado16@yahoo.com",
        pass: "beyzbcxqyyunhzlp"
    }
};

const transporter = nodemailer.createTransport(smtpConfig);

// const mailOptions = {
//     envelope: {
//         from: "domado16@yahoo.com",
//         to: "dominique.adolphe@gmail.com"
//     },
//     raw: {
//         path: "/home/mecrogenesis/Organizations/co.prethora/@typescript/smtp_email_aggregator_relay/rawmessage"
//     }
// };

// transporter.sendMail(mailOptions,(error,info) =>
// {
//     if (error)
//     {
//         return console.log("error",error);
//     }
//     console.log("Message sent: "+info.response);
// });

(async () =>
{      
    const message1 = readFileSync(packagePath+"/messages/2021-11-25T15:56:07.586Z","utf8");
    const message2 = readFileSync(packagePath+"/messages/2021-11-25T15:56:14.992Z","utf8");

    const mail1 = await simpleParser(message1);
    const mail2 = await simpleParser(message2);

    const mailOptions = {
        from: "Dominiqe Adolphe <domado16@yahoo.com>",
        // to: "shop@pextons.co.uk",
        to: "dominique.adolphe@gmail.com",
        subject: "Consolidated Invoice and Statement for The Good Food Shop",
        text: `Dear The Good Food Shop,

Please find attached your latest invoices and statement from Pextons Hardware.
        
Thank you for shopping with us.`,
        attachments: [
            {filename: mail1.attachments[0].filename,content: mail1.attachments[0].content},
            {filename: mail2.attachments[0].filename,content: mail2.attachments[0].content}
        ]
    };

    sender.sendMail(mailOptions,(error,info) =>
    {
        if (error)
        {
            return console.log("error",error);
        }
        console.log("Message sent: "+info.response);
    });
    
    // console.log(await Jobs.load());
    
    // await sendQueue.add({
    //     from: "domado16@yahoo.com",
    //     to: "dominique.adolphe@gmail.com"
    // },createReadStream(rawmessagePath));
    // console.log("done");
});// ();

(async () => 
{
    sendQueue.start();
});//();

(async () => 
{
    const rstream = createReadStream(__dirname+"/../messages/invoice.mail");
    const header = {
        from: "domado16@yahoo.com",
        to: "dominique.adolphe@gmail.com"
    };
    aggregator.addMessage(header,rstream);
});//();

(async () => 
{
    // const mail = await simpleParser(await readFile(__dirname+"/../messages/invoice.mail","utf8"));
    // console.log(mail.attachments.length);

    const w = await Waiting.load("d70761bff6587b7255e0cea6c362d88685baaa6d");
    // const message = await w.createMessage("statement");
    // for(let i=0;i<mail.attachments.length;i++)
    // {
    //     const { filename,content } = mail.attachments[i];
    //     await message.addAttachment(filename?filename:"nofilename",content);
    // }
    // await message.writeHeader();
    // console.log("done");

    // const messages = await w.loadAllMessages();
    // console.log(messages[0].attachments);
    
    // const waiting = new Waiting("domado16@yahoo.com","bob.dilan@gmail.com","Dom Dom");
    // await waiting.writeHeader();
    // console.log("done");
});//();

(async () => 
{
    const composer = new MailComposer({
        from: "Dominique Adolphe <domado16@yahoo.com>",
        to: "dominique.adolphe@gmail.com",
        subject: "this is the subject 2",
        text: "this is the email body",
        attachments: [
            {
                filename: "tsconfig.json",
                path: "/home/mecrogenesis/Organizations/co.prethora/@typescript/smtp_email_aggregator_relay/tsconfig.json"
            }
        ]
    });

    const tmpMessagePath = __dirname+"/../tmpmessage";
    await writeFile(tmpMessagePath,await composer.compile().build());

    const mailOptions = {
        envelope: {
            from: "domado16@yahoo.com",
            to: "dominique.adolphe@gmail.com"
        },
        raw: {
            path: tmpMessagePath
        }
    };

    await sender.sendMail(mailOptions);
    console.log("done");    
});//();

(async () => 
{
    let waiting = new Waiting("domado16@yahoo.com","bob.dilan@gmail.com","Dom Dom",{ address: "domado16@yahoo.com",name: "Dominique Adolphe" });
    await waiting.writeHeader();
    waiting = new Waiting("domado16@yahoo.com","johnjohn@gmail.com","Bing Bing",{ address: "domado16@yahoo.com",name: "Dominique Adolphe" });
    await waiting.writeHeader();
    console.log(await Waiting.loadAll());
})();