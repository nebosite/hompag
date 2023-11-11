import { ServerConfigType } from "hompag-common";
import { ILogger } from "../helpers/logger";
import { hompagItemType, IItemStore, ItemReturn } from "./ServerModel";
import * as fs from "fs"
import * as path from "path"

export class PageAccessLocalDisk implements IItemStore
{
    private _logger: ILogger;
    private _storeLocation: string;

    private _folders = new Map<string, string>();

    // ---------------------------------------------------------------------------------
    // ctor
    // ---------------------------------------------------------------------------------
    constructor(storeLocation: string, logger: ILogger)
    {
        this._logger = logger;
        this._storeLocation = storeLocation;
        if (!fs.existsSync(this._storeLocation)) {
            throw Error(`Store location is not valid: ${this._storeLocation}`)
        }

        const addFolder = (name: string) => { 
            const folderName =  path.join(this._storeLocation, name)
            if(!fs.existsSync(folderName)){
                fs.mkdirSync(folderName)
            }
            this._folders.set(name, folderName);
        }

        addFolder("page");
        addFolder("widget");
        addFolder("config");
        addFolder("cache");

        fs.watch( this._storeLocation, (eventType: any, filename:any) => {
            console.log(`  >> FILE CHANGE: ${eventType} ${filename}`);
        })
    }

    //--------------------------------------------------------------------------------------
    // 
    //--------------------------------------------------------------------------------------
    refresh() { 
        
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
            const typeFolder = this._folders.get(itemType);
            if(!typeFolder || !fs.existsSync(typeFolder)){
                this._logger.logLine(`${itemType} folder does not exist`)
                resolve([])
            }

            fs.readdir(typeFolder!,  (err: any, files: any[]) => {
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
            const itemFolder = this.ensureItemFolder(itemType, id);
            
            fs.readdir(itemFolder as string,  (err: any, files: any[]) => {
                
                if (err) {
                    this._logger.logError(`Cannot load Item '${itemType}/${id}': ` + err)
                    resolve([])
                } 

                if(!files) return [];

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
    // ensureItemFolder
    // ---------------------------------------------------------------------------------
    private ensureItemFolder(itemType: hompagItemType, id: string)
    {
        const itemRootFolder = this._folders.get(itemType);
        if(!itemRootFolder || !fs.existsSync(itemRootFolder)){
            this._logger.logError(`No root folder for ${itemType} items`)
            return []
        }
      
        const itemFolder =  path.join(itemRootFolder, id)
        if(!fs.existsSync(itemFolder)){
            fs.mkdirSync(itemFolder)
        }
        return itemFolder;
    }

    // ---------------------------------------------------------------------------------
    // storeItem
    // ---------------------------------------------------------------------------------
    async storeItem(itemType: hompagItemType, id: string, version: number, data: string)
    {
        this._logger.logLine(`Storing ${itemType} ${id} ${version}`)
        return new Promise<void>((resolve, reject) => {
            const itemFolder = this.ensureItemFolder(itemType, id);

            const fileName = path.join(itemFolder as string, `${version}.json`)
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

    // ---------------------------------------------------------------------------------
    // getConfig
    // ---------------------------------------------------------------------------------
    async getConfig(type: ServerConfigType) {
        const fileName = path.join(this._storeLocation, `config/${type}.json`)

        return new Promise<string>((resolve, reject) => {
            fs.readFile(fileName, 'utf8' , (err: any, data: any) => {
                if (err) {  reject (`Error reading file '${fileName}': ${err}`) }
                this._logger.logLine(`Loaded config: ${fileName}`)
                resolve(data)
            } )                             
        })
    }
}