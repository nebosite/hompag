
import { Request, Response } from "express";
import { serverModel } from "..";

// ---------------------------------------------------------------------------------
// REST Api to show server health
// ---------------------------------------------------------------------------------
export function showHealth(req: Request, res: Response) {
    const health = serverModel.getHealth();   
    res.end(JSON.stringify(health,null,2));
};