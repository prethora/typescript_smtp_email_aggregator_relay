import { EmailAddress } from "mailparser";

export interface TMessageHeader
{
    from: string;
    to: string;
    simulateErrorCount?: number;
}

export interface TConfig
{
    outgoing: {
        host: string;
        port: number;
        secure: boolean;
        auth? : {
            user: string;
            pass: string;
        };
    };
    incoming: {
        port: number;
    };
    aggregate: {
        subject: string;
        bodyFile: string;
        waitForUpToMinutes: number;
        checkExpiryEverySeconds: number;
    };
    sendQueue: {
        threads: number;
        pollIntervalSeconds: number;
        failure: {
            retries: number;
            pauseMinutes: number;    
        };    
    };
    logging: {
        combined: {
            on: true;
            file: string;
        };
        errors: {
            on: true;
            file: string;
        };
        debug: {
            file: string;
        };
    };
}

export type TEmailType = "invoice" | "statement";

export type TEmailFromAddress = EmailAddress;