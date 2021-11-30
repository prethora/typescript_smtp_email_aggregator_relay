import express from "express";
import { config } from "./config";

export const startLiveTestServer = () => 
{
    const app = express();
    app.get("/",(req,res) => 
    {
        res.send("OK");
    });

    app.listen(config.liveTestServer.port,config.liveTestServer.host,() => 
    {
        console.log(`live test server listening on ${config.liveTestServer.host}:${config.liveTestServer.port}`);
    });
};