
import { Request, Response } from "express";
import { serverModel } from "..";
import { ILogger } from "../helpers/logger";
import { safeSend, UserError } from "../helpers/SafeSend";

// ---------------------------------------------------------------------------------
// REST Api to handle queries
// ---------------------------------------------------------------------------------
export function handleQueries(logger:ILogger) {
    return async (req: Request, res: Response) => {  
        await safeSend(res, logger, req.url, async () => {
            
            const type = req.query.type
            if(type === "widgetversions")
            {
                const ids = (req.query.ids as string)?.split(',') ?? []
                if(ids.length === 0) throw new UserError("Must provide comma-separated widget ids in the 'ids' parameter")
                
                const output:{id:string, version:number | null}[] = []
                for(let i = 0; i < ids.length; i++)
                {
                    output.push({id: ids[i], version: await serverModel.getWidgetVersion(ids[i])})
                }
                
                return output;
            }
            else throw new UserError(`bad query type: ${type}`)
            // const id = req.params.id;
            // return await serverModel.storeWidget(id, req.body)
        })   
    }
};

