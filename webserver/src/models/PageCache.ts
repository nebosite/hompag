import { ILogger } from "../helpers/logger";
import { hompagItemType, IItemStore, ItemReturn } from "./ServerModel";

interface CacheInfo
{
    itemType: string
    id: string
    isLatest: boolean
    version: number
    written: boolean
    data?: string
}


export class PageCache implements IItemStore{

    _deepStore: IItemStore;

    _cache = new Map<hompagItemType, Map<string, CacheInfo[]>>();
    _recentUpdates =    new Array<CacheInfo>();
    _loadingTask:Promise<void>;
    _logger: ILogger;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(deepStore: IItemStore, logger: ILogger)
    {
        this._deepStore = deepStore;
        this._logger = logger;

        this._loadingTask = new Promise<void>(async (resolve) => {
            const pages = await deepStore.getIdList(hompagItemType.page);
            this._cache.set(hompagItemType.page, new Map<string, CacheInfo[]>())
            this._cache.set(hompagItemType.widget, new Map<string, CacheInfo[]>())
            const pageCache = this._cache.get(hompagItemType.page);
            pages.forEach(p => {
                pageCache!.set(p, new Array<CacheInfo>())
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
    // get the cache that holds a particular item
    //------------------------------------------------------------------------------------------
    async getItemCache(itemType: hompagItemType, id: string)
    {
        await this._loadingTask;
        const itemCache = this._cache.get(itemType)
        if(!itemCache) throw Error(`No cache for ${itemType}`)

        if(!itemCache.has(id))
        {
            itemCache.set(id, [])
        }

        return itemCache.get(id)!;
    }

    //------------------------------------------------------------------------------------------
    // return the ids of all the items for a particular type
    //------------------------------------------------------------------------------------------
    async getIdList(itemType: hompagItemType): Promise<string[]>
    {
        await this._loadingTask;
        const itemCache = this._cache.get(itemType)
        if(!itemCache) return [];
        return Array.from(itemCache.keys())
    }

    //------------------------------------------------------------------------------------------
    // storeItem
    //------------------------------------------------------------------------------------------
    async storeItem(itemType: hompagItemType, id: string, version: number, data: string): Promise<void> {
        const itemCache = await this.getItemCache(itemType, id);

        itemCache.forEach(i => i.isLatest = false);
        const info:CacheInfo = {itemType, id, isLatest:true, version, written: false, data}
        itemCache.unshift(info)
        this._recentUpdates.push(info);
    }


    //------------------------------------------------------------------------------------------
    // getItem
    //------------------------------------------------------------------------------------------
    async getItem(itemType: hompagItemType, id: string, requestedVersion: number | undefined): Promise<ItemReturn | null> {
        const itemCache = await this.getItemCache(itemType, id);

        const loadVersionFromDeepStore = async () => {
            const deepItem = await this._deepStore.getItem(itemType, id, requestedVersion);
            if(!deepItem) return undefined;
            const info = {
                id,
                itemType,
                isLatest: requestedVersion === undefined,
                version: deepItem.version,
                written: true,
                data: deepItem.data
            }
            itemCache.push(info)    
            return info;        
        }

        let item = requestedVersion 
            ? itemCache.find(w => w.version === requestedVersion)
            : itemCache.find(w => w.isLatest)

        
        if(!item) item = await loadVersionFromDeepStore();

        if(item) return {type: itemType, id, version: item!.version, data: item!.data!}
        else return null;
    }
}