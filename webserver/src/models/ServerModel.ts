

import { Logger } from "../helpers/logger";
import moment from "moment";
import { VERSION } from ".."; 

export interface PageData {
    pageDetails: any;
}

export interface IPageAccess
{
    getPage(pageId: string): Promise<PageData | null>;
    getPageList(): Promise<string[]>;
    storePage(pageId: string, data: PageData): Promise<null>;
}



//------------------------------------------------------------------------------------------
// The state of the server overall
//------------------------------------------------------------------------------------------
export class ServerModel {
    logger: Logger
    private _startTime = Date.now();
    private _pageAccess: IPageAccess;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: Logger, pageAccess: IPageAccess)
    {
        this.logger = logger;
        this._pageAccess = pageAccess;
    }


    //------------------------------------------------------------------------------------------
    // getPage
    //------------------------------------------------------------------------------------------
    async getPage(pageId: string) 
    {
        const foundPage = await this._pageAccess.getPage(pageId);
        if(foundPage) return foundPage.pageDetails;
        else return {} 
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
    storePage(pageId: string, pageData: any) 
    {
        return this._pageAccess.storePage(pageId, {pageDetails: pageData})
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

