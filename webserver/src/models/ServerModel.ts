

import { Logger } from "../helpers/logger";
import moment from "moment";
import { VERSION } from "../GLOBALS";


export interface ItemReturn
{
    id: string
    type: hompagItemType
    version: number
    data: string
}

export enum hompagItemType
{
    page= "page",
    widget = "widget",
}


export interface IItemStore
{
    getItem(itemType: hompagItemType, id: string, version: number | undefined): Promise<ItemReturn | null>;
    getIdList(itemType: hompagItemType): Promise<string[]>;
    storeItem(itemType: hompagItemType, id: string, version: number, data: string): Promise<void>;
}

export interface IListener{
    name: string    
    close():void;
    send(data: any): Promise<void>
}


export interface TransientStatePacket
{
    id: string
    name: string
    instance: number
    data: any
}

//------------------------------------------------------------------------------------------
// The state of the server overall
//------------------------------------------------------------------------------------------
export class ServerModel {
    //------------------------------------------------------------------------------------------
    logger: Logger
    private _startTime = Date.now();
    private _pageAccess: IItemStore;
    private _listeners = new Map<string, IListener>();
    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(pageAccess: IItemStore, logger: Logger)
    {
        this.logger = logger;
        this._pageAccess = pageAccess;
    }

    //------------------------------------------------------------------------------------------
    // registerListener - register instances that want to know about page changes
    //------------------------------------------------------------------------------------------
    registerListener(listener: IListener)
    {
        this._listeners.set(listener.name, listener);
    }

    //------------------------------------------------------------------------------------------
    // unregisterListener 
    //------------------------------------------------------------------------------------------
    unregisterListener(name: string)
    {
        this._listeners.delete(name)
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async getPage(pageId: string, version: number | undefined = undefined) 
    {
        return await this._pageAccess.getItem(hompagItemType.page, pageId, version);
    }

    //------------------------------------------------------------------------------------------
    // getWidget
    //------------------------------------------------------------------------------------------
    async getWidget(id: string, version: number | undefined = undefined) 
    {
        return await this._pageAccess.getItem(hompagItemType.widget, id, version);
    }

    //------------------------------------------------------------------------------------------
    // getWidgetVersion - get latest version for a widget
    //------------------------------------------------------------------------------------------
    async getWidgetVersion(id: string) 
    {
        // get latest item and
        const item = await this._pageAccess.getItem(hompagItemType.widget, id, undefined);
        if(!item) return null;
        return item.version;
    }

    //------------------------------------------------------------------------------------------
    // getPages
    //------------------------------------------------------------------------------------------
    async getPages() 
    {
        return (await this._pageAccess.getIdList(hompagItemType.page));
    }

    //------------------------------------------------------------------------------------------
    // storeItem
    //------------------------------------------------------------------------------------------
    async storeItem(itemType: hompagItemType, id: string, payload: string)
    {
        const updateDetails = JSON.parse(payload) as {id: number, data: any}
        const version = Math.floor(Date.now())
        await this._pageAccess.storeItem(
            itemType, 
            id, 
            version, 
            JSON.stringify(updateDetails.data,null,2))
        
        this.sendAlert({type: "itemchange", data: {type: itemType, itemId: id, version}})
        return version;
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async storePage(pageId: string, payload: string) 
    {
        return this.storeItem(hompagItemType.page, pageId, payload);
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async storeWidget(widgetId: string,  payload: string) 
    {
        return this.storeItem(hompagItemType.widget, widgetId, payload);
    }

    //------------------------------------------------------------------------------------------
    // sendAlert
    //------------------------------------------------------------------------------------------
    sendAlert(message: { type: string; data: any; }) {
        this._listeners.forEach(l => l.send(message))
    }

    //------------------------------------------------------------------------------------------
    // handleMessage
    //------------------------------------------------------------------------------------------
    handleMessage(message: { type: string; data: any; }) {
        this.sendAlert(message) 
    }

    //------------------------------------------------------------------------------------------
    // getHealth
    //------------------------------------------------------------------------------------------
    getHealth() {
        let upTime = moment().valueOf() - this._startTime.valueOf();

        const spanText = (span: number) => {
            const msPerDay = 1000 * 3600 * 24;
            const days = Math.floor(span / msPerDay);
            span %= msPerDay;
            const msPerHour = 1000 * 3600;
            const hours = Math.floor(span/ msPerHour);
            span %= msPerHour;
            const minutes = Math.floor(span / 60000);
            span %= 60000;
            const seconds = Math.floor(span / 1000);
            return `${days} days ${hours.toString().padStart(2,"0")} hours  ${minutes.toString().padStart(2,"0")} minutes  ${seconds.toString().padStart(2,"0")} seconds`;
        }
    
        return {
            version: VERSION,
            uptime: spanText(upTime),
        };
    
    }

}

