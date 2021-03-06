
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api getActionList
// ---------------------------------------------------------------------------------
export function getActionList(logger:ILogger) {
    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            return await serverModel.getActionList();
        })   
    }
};

// ---------------------------------------------------------------------------------
// REST Api executeAction
// ---------------------------------------------------------------------------------
export function executeAction(logger:ILogger) {
    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            const {actionName} = req.params;
            return await serverModel.executeAction(actionName);
        })   
    }
};
