import { ILogger } from "../helpers/logger";
import { IPageAccess } from "./ServerModel";
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
    // Convert page name to a file name for storage
    // ---------------------------------------------------------------------------------
    pageToFileName(pageId: string)
    {
        return `_page_${pageId}.json`;
    }

    // ---------------------------------------------------------------------------------
    // getPageList
    // ---------------------------------------------------------------------------------
    getPageList():Promise<string[]> {

        return new Promise<string[]>((resolve, reject) => {
            
            if (!fs.existsSync(this._storeLocation)) {
                this._logger.logError(`Store location is not valid: ${this._storeLocation}`)
                resolve([])
            }
            else {
                fs.readdir(this._storeLocation ,  (err: string, files: any[]) => {
                    if (err) {
                        this._logger.logError('Unable to scan directory: ' + err)
                        resolve([])
                    } 

                    const output:string[] = [];
                    files.forEach(f => {
                        const match = f.match(/_page_(.*)\.json/);
                        if(match) output.push(match[1])
                    })
                    resolve(output);
                })
            }            
        })
    }

    // ---------------------------------------------------------------------------------
    // getPage
    // ---------------------------------------------------------------------------------
    getPage(pageId: string) {
        const fileName = path.join(this._storeLocation, this.pageToFileName(pageId))

        return new Promise<string | null>((resolve, reject) => {
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
                        resolve(data)
                    }
                )                  
            }            
        })
    }

    // ---------------------------------------------------------------------------------
    // storePage
    // ---------------------------------------------------------------------------------
    async storePage(pageId: string, data: string)
    {
        const fileName = path.join(this._storeLocation, this.pageToFileName(pageId))
        return new Promise<null>((resolve, reject) => {
            fs.writeFile(fileName, data, (err: any) => {
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