import { SMTPServer } from "smtp-server";
import { createWriteStream } from "fs";
import { streamToFile } from "./lib/misc";
import { simpleParser } from "mailparser";
import { readFile } from "fs-extra";

const port = 5025;

const server = new SMTPServer({
    async onData(stream,session,callback) 
    {
        console.log(JSON.stringify(session,null,4));
        const timestamp = (new Date()).toISOString();
        const filePath = __dirname+"/../messages/"+timestamp;
        await streamToFile(stream,filePath);        
        console.log(`Message saved: messages/${timestamp}`);
        const mail = await simpleParser(await readFile(filePath));
        const { from,to,subject,text } = mail;
        console.log(JSON.stringify({ from,to,subject,text },null,4));
        callback();
    },
    authOptional: true,
    hideSTARTTLS: true
    // onAuth(auth,session,callback) 
    // {
    //     console.log(`auth: username: ${auth.username}; password: ${auth.password}`);
    //     // if (auth.username !== "abc" || auth.password !== "def") {
    //     //   return callback(new Error("Invalid username or password"));
    //     // }
    //     callback(null, { user: 123 }); // where 123 is the user id or similar property
    // }
});
server.listen(port,"0.0.0.0",() => 
{
    console.log(`listening on port ${port}`);
});
