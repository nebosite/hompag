

import { Logger } from "../helpers/logger";
import moment from "moment";
import { VERSION } from ".."; 


export interface IPageAccess
{
    getPage(pageId: string): Promise<string | null>;
    getPageList(): Promise<string[]>;
    storePage(id: string, data: string): Promise<null>;
    storeWidget(id: string, data: string): Promise<null>;
    getWidget(id: string): Promise<string | null>;

}

export interface IListener{
    name: string    
    close():void;
    send(data: any): Promise<void>
}

//------------------------------------------------------------------------------------------
// The state of the server overall
//------------------------------------------------------------------------------------------
export class ServerModel {
    logger: Logger
    private _startTime = Date.now();
    private _pageAccess: IPageAccess;
    private _listeners = new Map<string, IListener>();
    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: Logger, pageAccess: IPageAccess)
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
    async getPage(pageId: string) 
    {
        return await this._pageAccess.getPage(pageId);
    }

    //------------------------------------------------------------------------------------------
    // getPages
    //------------------------------------------------------------------------------------------
    async getPages() 
    {
        return (await this._pageAccess.getPageList());
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async storePage(pageId: string, pageData: string) 
    {
        await this._pageAccess.storePage(pageId, pageData)
        
        this.sendAlert({type: "page", id: pageId})
    }

    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async storeWidget(widgetId: string, data: string) 
    {
        await this._pageAccess.storeWidget(widgetId, data)
        this.sendAlert({type: "widget", id: widgetId})  
    }

    //------------------------------------------------------------------------------------------
    // sendAlert
    //------------------------------------------------------------------------------------------
    sendAlert(info: {type: string, id: string}) {
        this._listeners.forEach(l => l.send(info))
    }

    //------------------------------------------------------------------------------------------
    // getWidget
    //------------------------------------------------------------------------------------------
    async getWidget(id: string) 
    {
        return await this._pageAccess.getWidget(id);
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

