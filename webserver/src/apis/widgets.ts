
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend } from "../helpers/SafeSend";

// // ---------------------------------------------------------------------------------
// // REST Api to retrieve list of pages
// // ---------------------------------------------------------------------------------
// export function getPages(logger:ILogger) {
//     return async (req: Request, res: Response) => {
//         await safeSend(res, logger, req.url, async () => {
//             return await serverModel.getPages();
//         })   
//     }
// };
// ---------------------------------------------------------------------------------
// REST Api to retrieve a page
// ---------------------------------------------------------------------------------
export function getWidget(logger:ILogger) {

    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            const id = req.params.id;
            return await serverModel.getWidget(id);
        })   
    }
};

// ---------------------------------------------------------------------------------
// REST Api to store a page
// ---------------------------------------------------------------------------------
export function storeWidget(logger:ILogger) {
    return async (req: Request, res: Response) => {
        await safeSend(res, logger, req.url, async () => {
            const id = req.params.id;
            await serverModel.storeWidget(id, req.body)
            return "OK"
        })   
    }
};