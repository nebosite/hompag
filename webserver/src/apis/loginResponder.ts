
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api to handle responses to login requests
// ---------------------------------------------------------------------------------
export function handleLoginResponse(logger:ILogger) {
    return async (req: Request, res: Response) => {  
        await safeSend(res, logger, req.url, async () => {
            const app = req.params.app;
            return await serverModel.handleLoginResponse(app, req.query, req.body);
        })   
    }
};

