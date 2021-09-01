

import { ILogger } from "../helpers/logger";
import moment from "moment";
import { VERSION } from "../GLOBALS";
import { SpotifyModel } from "./SpotifyModel";
import { ServerConfigType, ServerMessageType, StatePacket } from "hompag-common";
import {exec} from "child_process"


interface ActionDetail
{
    name: string
    command: string
}

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
    getConfig(configType: ServerConfigType): Promise<string>;
}

export interface IListener{
    name: string    
    close():void;
    send(data: any): Promise<void>
}

export interface ServerConfig {
    spotify: {
        clientId: string
        clientSecret: string
    }
}

//------------------------------------------------------------------------------------------
// The state of the server overall
//------------------------------------------------------------------------------------------
export class ServerModel {

    //------------------------------------------------------------------------------------------
    logger: ILogger
    private _startTime = Date.now();
    private _pageAccess: IItemStore;
    private _listeners = new Map<string, IListener>();

    spotify: SpotifyModel

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(config: ServerConfig, pageAccess: IItemStore, logger: ILogger)
    {
        this.logger = logger;
        this._pageAccess = pageAccess;

        const spotifyAlerter = (data: StatePacket) => {
            this.rememberTransientState(data);
            this.sendAlert({type: ServerMessageType.transient_change, data: data} )
        }
        this.spotify = new SpotifyModel(logger, config.spotify.clientId, config.spotify.clientSecret, spotifyAlerter);
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
    // getItemVersion - get latest version for an item
    //------------------------------------------------------------------------------------------
    async getItemVersion(type: hompagItemType, id: string) 
    {
        // get latest item and
        const item = await this._pageAccess.getItem(type, id, undefined);
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
        
        this.sendAlert({type: ServerMessageType.item_change, data: {type: itemType, itemId: id, version}})
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


    // this maps widgetId, stateName to some blob
    private transientStates = new Map<string, Map<string, any>>();

    //------------------------------------------------------------------------------------------
    // rememberTransientState
    //------------------------------------------------------------------------------------------
    rememberTransientState(packet: StatePacket) 
    {
        if(!this.transientStates.has(packet.id))
        {
            this.transientStates.set(packet.id, new Map<string, any>())
        }

        const widgetState = this.transientStates.get(packet.id);
        if(widgetState) {
            widgetState?.set(packet.name, packet.data)
        }
        else {
            console.log(`Can't remember state for ${packet.id}`)
        }
    }

    //------------------------------------------------------------------------------------------
    // handleMessage
    //------------------------------------------------------------------------------------------
    handleMessage(message: { type: ServerMessageType; data: any; }) {
        switch(message.type)
        {
            case ServerMessageType.item_change: 
                this.sendAlert(message); 
                break;
            case ServerMessageType.transient_change:
                this.rememberTransientState(message.data);
                this.sendAlert(message);
                break;
            case ServerMessageType.transient_request:
                const state = message.data as StatePacket;
                state.data = this.transientStates.get(state.id)?.get(state.name)
                return {
                    type: ServerMessageType.transient_change,
                    data: state
                }
                break;
            default: 
                throw Error(`Unknown message type: ${message.type}`)
        }
        return null;
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

    //------------------------------------------------------------------------------------------
    // handleLoginResponse
    //------------------------------------------------------------------------------------------
    handleLoginResponse(app: string, query: any, body: any): any {
        switch(app){
            case "spotify":  return this.spotify.handleLoginResponse(query); 
            default: throw new Error(`Unknown login response app: ${app}`)
        }
    }

    //------------------------------------------------------------------------------------------
    // getActionList
    //------------------------------------------------------------------------------------------
    async getActionList() {
        return JSON.parse(await this._pageAccess.getConfig(ServerConfigType.Action))
    }

    //------------------------------------------------------------------------------------------
    // executeAction
    //------------------------------------------------------------------------------------------
    async executeAction(actionName: string) {
        setTimeout(async ()=>{
            this.logger.logLine(`Executing Server Action: ${actionName}`)
            const actionConfig = await this._pageAccess.getConfig(ServerConfigType.Action)
            const actions = JSON.parse(actionConfig).actions as ActionDetail[]
            const actionDetail = actions.find(d => d.name === actionName)
            if(!actionDetail) {
                this.logger.logError(`Cannot find action called '${actionName}'`)
            }
            else {
                this.logger.logLine(`Executing command: ${actionDetail.command}`)
                const process = exec(actionDetail.command)
                process.on('error', (error) => {
                    this.logger.logError(`Spawn failed: ${error.message}`);
                });
                
                process.on("close", code => {
                    this.logger.logLine(`child process exited with code ${code}`);
                });
            }
        },0)
        return null;
    }
}

