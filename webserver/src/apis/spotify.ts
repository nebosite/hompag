
import { Request, Response } from "express";
import { serverModel } from "..";
import { listening_port } from "../GLOBALS";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api to handle queries
// ---------------------------------------------------------------------------------
export function handleSpotifyCommand(logger:ILogger) {
    return async (req: Request, res: Response) => {  
        await safeSend(res, logger, req.url, async () => {
            const command = req.params.command;
            //console.log(`req: ${req.originalUrl} || ${req.url} || ${req.hostname} || ${req.method} || ${req.protocol}`)
            return serverModel.spotify.handleSpotifyCommand(command, `${req.protocol}://${req.hostname}:${listening_port}`, JSON.parse(req.body));
        })   
    }
};

