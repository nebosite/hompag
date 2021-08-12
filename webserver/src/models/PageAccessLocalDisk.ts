import { ILogger } from "../helpers/logger";
import { hompagItemType, IItemStore, ItemReturn } from "./ServerModel";
const fs = require('fs')
const path = require('path');

export class PageAccessLocalDisk implements IItemStore
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
        if (!fs.existsSync(this._storeLocation)) {
            throw Error(`Store location is not valid: ${this._storeLocation}`)
        }
    }

    // ---------------------------------------------------------------------------------
    // name converters
    // ---------------------------------------------------------------------------------
    pageToFileName =    (pageId: string) => `_page_${pageId}`;
    widgetToFileName =  (pageId: string) => `_widget_${pageId}`;


    // ---------------------------------------------------------------------------------
    // getIdList
    // ---------------------------------------------------------------------------------
    getIdList(itemType: hompagItemType): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const typeFolder = path.join(this._storeLocation, itemType)
            fs.readdir(typeFolder,  (err: string, files: any[]) => {
                if (err) {
                    this._logger.logError('Unable to scan directory: ' + err)
                    resolve([])
                } 

                resolve(files as string[]);
            })
        })
    }

    // ---------------------------------------------------------------------------------
    // getVersionList
    // ---------------------------------------------------------------------------------
    getVersionList(itemType: hompagItemType, id: string): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            const itemFolder = path.join(this._storeLocation, `${itemType}/${id}`)
            fs.readdir(itemFolder,  (err: string, files: any[]) => {
                if (err) {
                    this._logger.logError(`Cannot load Item '${itemType}/${id}': ` + err)
                    resolve([])
                } 

                const output = files.map(f => {
                    const versionText = (f as string).replace(/\.json$/i, "")
                    try {
                        return Number.parseInt(versionText)
                    }
                    catch(e)
                    {
                        return -1;
                    }
                }).filter(i => i >= 0)
                output.sort((a,b) => b-a);
                resolve(output);
            })
        })
    }

    // ---------------------------------------------------------------------------------
    // getThing
    // ---------------------------------------------------------------------------------
    async getItem(itemType: hompagItemType, id: string, version: number | undefined) {
        if(!version) {
            const versions = await this.getVersionList(itemType, id);
            if(!versions || versions.length === 0) return null;
            version = versions[0];
        }

        const fileName = path.join(this._storeLocation, `${itemType}/${id}/${version}.json`)

        return new Promise<ItemReturn | null>((resolve, reject) => {

            fs.readFile(fileName, 'utf8' , (err: any, data: any) => {
                if (err) {
                    reject (`Error reading file '${fileName}': ${err}`)
                }
                this._logger.logLine(`Loaded file: ${fileName}`)

                resolve({type: itemType, id, version: version!, data})
            } )                             
        })
    }

    // ---------------------------------------------------------------------------------
    // storeItem
    // ---------------------------------------------------------------------------------
    async storeItem(itemType: hompagItemType, id: string, version: number, data: string)
    {
        return new Promise<void>((resolve, reject) => {
            const itemFolder =  path.join(this._storeLocation, `${itemType}/${id}`)
            if(!fs.existsSync(itemFolder)){
                fs.mkdirSync(itemFolder)
            }

            const fileName = path.join(itemFolder, `${version}.json`)
            fs.writeFile(fileName, data, (err: any) => {
                    if (err) {
                        reject (Error(`Error writing '${fileName}': ${err}`))
                    }
                    this._logger.logLine(`Stored item at: ${fileName}`)

                    resolve()
                }
            )              
        })
    }

}