import { ILogger } from "../helpers/logger";
import { IPageAccess, PageData } from "./ServerModel";
const fs = require('fs')
const path = require('path');

export class PageAccessLocalDisk implements IPageAccess
{
    private _logger: ILogger;
    private _storeLocation: string;

    // ---------------------------------------------------------------------------------
    // ctor
    // ---------------------------------------------------------------------------------
    constructor(logger: ILogger, storeLocation: string)
    {
        this._logger = logger;
        this._storeLocation = storeLocation;
    }

    // ---------------------------------------------------------------------------------
    // getPage
    // ---------------------------------------------------------------------------------
    getPage(pageId: string) {
        const fileName = path.join(this._storeLocation, `${pageId}.json`)

        return new Promise<PageData | null>((resolve, reject) => {
            if (!fs.existsSync(fileName)) {
                this._logger.logLine(`Tried to load non-existent file: ${pageId}`)
                resolve(null)
            }
            else {
                fs.readFile(fileName, 'utf8' , (err: any, data: any) => {
                        if (err) {
                            reject (Error(`Error reading page '${pageId}': ${err}`))
                        }
                        this._logger.logLine(`Loaded page: ${pageId}`)
                        resolve(JSON.parse(data))
                    }
                )                  
            }            
        })
    }

    // ---------------------------------------------------------------------------------
    // storePage
    // ---------------------------------------------------------------------------------
    async storePage(pageId: string, data: PageData)
    {
        const fileName = path.join(this._storeLocation, `${pageId}.json`)
        return new Promise<null>((resolve, reject) => {
            fs.writeFile(fileName, JSON.stringify(data), (err: any) => {
                    if (err) {
                        reject (Error(`Error writing page '${pageId}': ${err}`))
                    }
                    this._logger.logLine(`Stored page: ${pageId}`)

                    resolve(null)
                }
            )              
        })
    }

}