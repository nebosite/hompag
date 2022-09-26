
import { Request, Response } from "express";
import { serverModel } from "..";
import { VERSION } from "../GLOBALS";

// ---------------------------------------------------------------------------------
// REST Api to show server health
// ---------------------------------------------------------------------------------
export function showHealth(req: Request, res: Response) {
    const health = serverModel.getHealth(VERSION);   
    res.end(JSON.stringify(health,null,2));
};