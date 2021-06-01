
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api to retrieve a page
// ---------------------------------------------------------------------------------
export function getPage(logger:ILogger) {

    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            const pageId = req.params.id;
            return await serverModel.getPage(pageId);
        })   
    }
};

// ---------------------------------------------------------------------------------
// REST Api to store a page
// ---------------------------------------------------------------------------------
export function storePage(logger:ILogger) {
    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            const pageId = req.params.id;
            await serverModel.storePage(pageId, req.body)
            return "OK"
        })   
    }
};