
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api for ping interface
// ---------------------------------------------------------------------------------
export function handlePingCommand(logger:ILogger) {
    return async (req: Request, res: Response) => {  
        await safeSend(res, logger, req.url, async () => {
            const command = JSON.parse(req.body) as {id: number, url: string}
            return serverModel.pinger.handlePing(command);
        })   
    }
};

