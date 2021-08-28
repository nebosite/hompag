import { ServerConfigType } from "hompag-common";
import { doNothing } from "../helpers/asyncHelper";
import { ILogger } from "../helpers/logger";
import { hompagItemType, IItemStore, ItemReturn } from "./ServerModel";

interface CacheInfo
{
    itemType: hompagItemType
    id: string
    isLatest: boolean
    version: number
    data: string
}


export class PageCache implements IItemStore{

    _deepStore: IItemStore;

    _cache = new Map<hompagItemType, Map<string, CacheInfo | null>>();
    _recentUpdates = new Map<string, CacheInfo>();
    _loadingTask:Promise<void>;
    _logger: ILogger;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(deepStore: IItemStore, logger: ILogger)
    {
        this._deepStore = deepStore;
        this._logger = logger;
        this._cache.set(hompagItemType.page, new Map<string, CacheInfo>())
        this._cache.set(hompagItemType.widget, new Map<string, CacheInfo>())

        this._loadingTask = new Promise<void>(async (resolve, reject) => {
             const pages = await deepStore.getIdList(hompagItemType.page);
             if(pages) {
                 logger.logLine(`Found ${pages.length} pages`)
                 const pageCache = this._cache.get(hompagItemType.page);
                 pages.forEach(p =>  pageCache!.set(p, null) )
             }
             else {
                 logger.logLine("No pages found")
             }
             resolve();
        })

        setTimeout(()=> this.backgroundWriter(), 1000)
    }

    //------------------------------------------------------------------------------------------
    // backgroundWriter
    //------------------------------------------------------------------------------------------
    async backgroundWriter()
    {
        const FLUSHING_AGE_MS = 60 * 1000;
        while(true)
        {
            await doNothing(1000);
            try {
                this.flushRecents(FLUSHING_AGE_MS, Date.now())
            }  
            catch(err)
            {
                this._logger.logError(`Flushing: ${err}`)
                await doNothing(10 * 1000)
            }
        }
    }

    //------------------------------------------------------------------------------------------
    // Write widgets to 
    //------------------------------------------------------------------------------------------
    async flushRecents(minAge_ms: number, now: number) {

        const availableItems =
            Array.from(this._recentUpdates.keys())
                .map(key =>  ({key, info: this._recentUpdates.get(key)!}))
        
        const itemsToFlush = availableItems.filter(i => now - i.info.version > minAge_ms)

        //this._logger.logLine(`Flush status:  [${availableItems.map(i => `${i.info.itemType}.${i.info.id}(${now - i.info.version})`).join(", ")}], ${itemsToFlush.length} flushable`)
        
        if(itemsToFlush.length > 0) {
            itemsToFlush.forEach(i => this._recentUpdates.delete(i.key));

            await Promise.all(itemsToFlush.map(i => {
                return new Promise<void>(async (resolve) => {            
                    await this._deepStore.storeItem(i.info.itemType, i.info.id, i.info.version, i.info.data);
                    resolve();
                })
            }));
        }            
    }


    //------------------------------------------------------------------------------------------
    // get the cache that holds a particular item 
    //------------------------------------------------------------------------------------------
    async getItemCache(itemType: hompagItemType)
    {
        await this._loadingTask;
        const itemCache = this._cache.get(itemType)
        if(!itemCache) throw Error(`No cache for ${itemType}`)

        return itemCache;
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
        const itemCache = await this.getItemCache(itemType);

        const info:CacheInfo = {itemType, id, isLatest:true, version, data}
        itemCache.set(id, info);
        this._recentUpdates.set(`${itemType}:${id}`,info);
        this._logger.logLine(`Update Queue is now: ${this._recentUpdates.size}`)
    }

    //------------------------------------------------------------------------------------------
    // getItem
    //------------------------------------------------------------------------------------------
    async getItem(itemType: hompagItemType, id: string, requestedVersion: number | undefined = undefined): Promise<ItemReturn | null> {
        const itemCache = await this.getItemCache(itemType);

        const loadVersionFromDeepStore = async () => {
            const deepItem = await this._deepStore.getItem(itemType, id, requestedVersion);
            if(!deepItem) return undefined;
            const info = {
                id,
                itemType,
                isLatest: requestedVersion === undefined,
                version: deepItem.version,
                data: deepItem.data
            }
            itemCache.set(id, info) 
            return info;        
        }

        let item = itemCache.get(id);

        if( !item
            ||  (requestedVersion && item.version !== requestedVersion)
            ||  (!requestedVersion && !item.isLatest)) 
        {
            item = await loadVersionFromDeepStore(); 
        }

        return item 
            ? {type: itemType, id, version: item!.version, data: item!.data!}
            : null
    }

    //------------------------------------------------------------------------------------------
    // clear an item from the cache
    //------------------------------------------------------------------------------------------
    async clearItem(itemType: hompagItemType, id: string)
    {
        const itemCache = await this.getItemCache(itemType);
        itemCache.delete(id);
    }

    //------------------------------------------------------------------------------------------
    // getConfig
    //------------------------------------------------------------------------------------------
    async getConfig(configType: ServerConfigType) {
        return this._deepStore.getConfig(configType) 
    }
}