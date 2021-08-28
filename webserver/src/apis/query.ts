
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend, UserError } from "../helpers/SafeSend";
import { hompagItemType } from "../models/ServerModel";

// ---------------------------------------------------------------------------------
// REST Api to handle queries
// ---------------------------------------------------------------------------------
export function handleQueries(logger:ILogger) {

    const runItemQuery = async (idParam: string | undefined, type: hompagItemType) => {
        const ids = idParam?.split(',') ?? []
        if(ids.length === 0) throw new UserError("Must provide comma-separated ids in the 'ids' parameter")
        
        const output:{id:string, version:number | null}[] = []
        for(let i = 0; i < ids.length; i++)
        {
            if(ids[i].trim() === "") continue;
            output.push({id: ids[i], version: await serverModel.getItemVersion(type, ids[i])})
        }
        
        return output;
    }

    return async (req: Request, res: Response) => {  
        await safeSend(res, logger, req.url, async () => {          
            const type = req.query.type
            switch(type) {
                case "widgetversions":  return runItemQuery(req.query.ids as string, hompagItemType.widget)
                case "pageversions":    return runItemQuery(req.query.ids as string, hompagItemType.page)
                default:  throw new UserError(`bad query type: ${type}`)
            }
        })   
    }
};

