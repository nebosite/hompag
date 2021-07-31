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
    // name converters
    // ---------------------------------------------------------------------------------
    pageToFileName =    (pageId: string) => `_page_${pageId}.json`;
    widgetToFileName =  (pageId: string) => `_widget_${pageId}.json`;

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
    // getThing
    // ---------------------------------------------------------------------------------
    getThing(fileName: string) {
        fileName = path.join(this._storeLocation, fileName)

        return new Promise<string | null>((resolve, reject) => {
            if (!fs.existsSync(fileName)) {
                this._logger.logLine(`Tried to load non-existent file: ${fileName}`)
                resolve(null)
            }
            else {
                fs.readFile(fileName, 'utf8' , (err: any, data: any) => {
                        if (err) {
                            reject (Error(`Error reading file '${fileName}': ${err}`))
                        }
                        this._logger.logLine(`Loaded file: ${fileName}`)
                        resolve(data)
                    }
                )                  
            }            
        })
    }

    // ---------------------------------------------------------------------------------
    // getPage
    // ---------------------------------------------------------------------------------
    getPage(pageId: string) {
        return this.getThing(this.pageToFileName(pageId))
    }

    // ---------------------------------------------------------------------------------
    // getWidget
    // ---------------------------------------------------------------------------------
    getWidget(widgetId: string) {
        return this.getThing(this.widgetToFileName(widgetId))
    }

    // ---------------------------------------------------------------------------------
    // storePage
    // ---------------------------------------------------------------------------------
    async storeThing(fileName:string, data: string)
    {
        fileName = path.join(this._storeLocation, fileName)
        return new Promise<null>((resolve, reject) => {
            fs.writeFile(fileName, data, (err: any) => {
                    if (err) {
                        reject (Error(`Error writing '${fileName}': ${err}`))
                    }
                    this._logger.logLine(`Stored item at: ${fileName}`)

                    resolve(null)
                }
            )              
        })
    }
    // ---------------------------------------------------------------------------------
    // storePage
    // ---------------------------------------------------------------------------------
    async storePage(id: string, data: string)
    {
        return this.storeThing(this.pageToFileName(id), data)
    }
    
    // ---------------------------------------------------------------------------------
    // storePage
    // ---------------------------------------------------------------------------------
    async storeWidget(id: string, data: string)
    {
        return this.storeThing(this.widgetToFileName(id), data)
    }

}