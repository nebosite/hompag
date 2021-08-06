import { ILogger } from "../helpers/logger";
import { IPageAccess, ItemReturn, VersionedItem } from "./ServerModel";

interface CacheInfo
{
    id: string
    version: number
    written: boolean
    arrivalTime: number
    data?: string
}
export class PageCache implements IPageAccess{

    _deepStore: IPageAccess;

    _pages = new Map<string, CacheInfo[]>();
    _widgets = new Map<string, CacheInfo[]>();
    _recentUpdates = new Array<CacheInfo>();
    _loadingTask:Promise<void>;
    _logger: ILogger;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(deepStore: IPageAccess, logger: ILogger)
    {
        this._deepStore = deepStore;
        this._logger = logger;

        this._loadingTask = new Promise<void>(async (resolve) => {
            const pages = await deepStore.getPageList();
            pages.forEach(p => {
                this._pages.set(p.id, p.versions.map(version => ({id: p.id, version, written: true, arrivalTime: 0})))
            })
            resolve();
        })

        setTimeout(this.backgroundWriter, 5000)
    }

    //------------------------------------------------------------------------------------------
    // backgroundWriter
    //------------------------------------------------------------------------------------------
    async backgroundWriter()
    {
        this._logger.logLine("Starting background writer...") 
    }

    //------------------------------------------------------------------------------------------
    // storePage
    //------------------------------------------------------------------------------------------
    async storePage(id: string, version: number, data: string): Promise<void> {
        await this._loadingTask;
        if(!this._pages.has(id))
        {
            this._pages.set(id, [])
        }

        const info = {id, version, written: false, arrivalTime: Date.now(), data}
        this._pages.get(id)?.unshift(info)
        this._recentUpdates.push(info);
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async getPage(id: string, version: number | undefined): Promise<ItemReturn | null> {
        if(!this._pages.has(id))
        {
            this._pages.set(id, [])
        }

        let foundVersion = this._pages.get(id)?.find(p => !version || p.version === version);
        if(!foundVersion || !foundVersion.data) {
            const deepVersion = await this._deepStore.getPage(id, version);
            if(!deepVersion) return null;

            if(foundVersion ){
                foundVersion.data = deepVersion.data;
            }
            else {
                foundVersion = {
                    id, 
                    version: deepVersion.version, 
                    written: true, 
                    arrivalTime: 0, 
                    data: deepVersion.data}

                this._pages.get(id)?.push(foundVersion)                
            }
        }

        return {
            id,
            version:foundVersion.version,
            data: foundVersion.data! 
        }
    }

    //------------------------------------------------------------------------------------------
    // getPageList
    //------------------------------------------------------------------------------------------
    async getPageList(): Promise<VersionedItem[]> {
        return Array.from(this._pages.keys()).map(k => {
            return {
                id: k,
                versions: this._pages.get(k)!.map(i => i.version)
            }
        })
    }


     //------------------------------------------------------------------------------------------
    // storeWidget
    //------------------------------------------------------------------------------------------
    async storeWidget(id: string, version: number, data: string): Promise<void> {
        if(!this._widgets.has(id))
        {
            this._widgets.set(id, [])
        }

        const info = {id, version, written: false, arrivalTime: Date.now(), data}
        this._widgets.get(id)?.unshift(info)
        this._recentUpdates.push(info);
    }

    //------------------------------------------------------------------------------------------
    // getWidget
    //------------------------------------------------------------------------------------------
    getWidget(id: string): Promise<string | null> {
        throw new Error("Method not implemented.");
    }
    //------------------------------------------------------------------------------------------
    // getWidgetList
    //------------------------------------------------------------------------------------------
    getWidgetList(ids: string[]): Promise<VersionedItem[]> {
        throw new Error("Method not implemented.");
    }

}