
import BruteForceSerializer from "helpers/BruteForceSerializer";
import { IDataChangeListener, WebSocketListener } from "helpers/DataChangeListener";
import { ILocalStorage, RestHelper } from "helpers/RestHelper";
import { ThrottledAction } from "helpers/ThrottledAction";
import { action, makeObservable, observable } from "mobx";
import { hompagTypeHelper, registerGlobalItem } from "./hompagTypeHelper";
import { PageModel } from "./PageModel";
import { WidgetModel, WidgetType } from "./WidgetModel";
import { dataTypeForWidgetType } from "./WidgetContainer"; 
import { TransientStateHandler } from "./TransientState";
import { ServerMessageType, StatePacket } from "hompag-common";


const WIDGET_VERSION_ISLOADING = -1;

interface ItemRequestResponse
{
    data: {
        type:string,
        id:string,
        version: number,
        data: string};
    errorMessage: string;
}

interface StoreResponse
{
    data: number;
    errorMessage: string;
}
interface WidgetVersionResponse
{
    data: {id: string, version: number}[];
    errorMessage: string;
}

export interface ItemChange
{
    type: string;
    itemId: string;
    version: number;
}



// -------------------------------------------------------------------
// The AppModel
// -------------------------------------------------------------------
export class AppModel {
    @observable serverStatus:any = null;
    @observable page: PageModel;
    @observable recentError?: string;

    private _localStorage:ILocalStorage;
    private _api:RestHelper;
    private _serializer: BruteForceSerializer;
    private _typeHelper: hompagTypeHelper;
    private _dataChangeListener: IDataChangeListener
    private _savePageThrottler = new ThrottledAction(500)
    private _transientHandlers = new Map<string, Map<string, TransientStateHandler<unknown>[]>>()

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(pageName: string, storage: ILocalStorage)
    {
        makeObservable(this);
        this._localStorage = storage;
        this._api = new RestHelper("/api/", this._localStorage); 
        registerGlobalItem("theApp", this);
        this._typeHelper = new hompagTypeHelper();
        this._serializer = new BruteForceSerializer(this._typeHelper)
        this._dataChangeListener = new WebSocketListener();
        this._dataChangeListener.addListener(ServerMessageType.item_change, this.handleItemChanges)
        this._dataChangeListener.addListener(ServerMessageType.transient_change, this.handleTransientChanges);

        setTimeout( ()=> this.loadPage(pageName),1)
    }

    // -------------------------------------------------------------------
    // Process incoming transient item changes (pages and widgets)
    // -------------------------------------------------------------------
    handleItemChanges = async(data:ItemChange) => {
        console.log(`Server says this changed: ${data.type}.${data.itemId}.${data.version}`)
        if(data.type === "page" 
            && this.page
            && this.page.name === data.itemId 
            && this.page.version !== data.version
            && this.page.version !== WIDGET_VERSION_ISLOADING) {
            console.log(`Initiating load: ${this.page.name}.${this.page.version}`)
            this.loadPage(data.itemId, false);           
        }
        else if(data.type === "widget") {
            const foundWidget = this.page.getWidget(data.itemId)
            if(foundWidget && foundWidget.version !== data.version && foundWidget.version !== WIDGET_VERSION_ISLOADING)
            {
                this.loadWidgetContent(foundWidget, false)   
            }
        } 
    }

    // -------------------------------------------------------------------
    // Process incoming transient state changes
    // -------------------------------------------------------------------
    handleTransientChanges = async(data: StatePacket) => {
        const handlerList = this._transientHandlers.get(data.id)?.get(data.name);

        if(!handlerList) return;
        handlerList.forEach(h => {
            if(h.instance !== data.instance) h.receive(data.data);
        })
    }


    // -------------------------------------------------------------------
    // Create a transient state handler
    //  id: Widget id that needs state 
    // -------------------------------------------------------------------
    createTransientStateHandler<T>(widgetId: string, propertyName: string, handler: (data: T)=>void)
    {
        const sender = (id: string, name: string, instance: number, data: T) => {
            const sendPacket: StatePacket = {
                id, name, instance, data
            }
            this._dataChangeListener.send({type: ServerMessageType.transient_change, data: sendPacket})
        }
        const output = new TransientStateHandler(widgetId, propertyName, handler, sender);
        if(!this._transientHandlers.has(widgetId)) {
            this._transientHandlers.set(widgetId, new Map<string, TransientStateHandler<unknown>[]>())
        }

        const nameHandlers = this._transientHandlers.get(widgetId)
        if(!nameHandlers.has(propertyName)) {
            nameHandlers.set(propertyName,[])
        }

        nameHandlers.get(propertyName).push(output as  TransientStateHandler<unknown>);
        this._dataChangeListener.send({type: ServerMessageType.transient_request, data: {id: widgetId, name: propertyName, instance: output.instance}})
        return output;
    }

    // -------------------------------------------------------------------
    // loadPage 
    // -------------------------------------------------------------------
    async loadPage(name: string, useCache: boolean = true)
    {
        // Allow any active page saves to complete by adding a new throttler
        // for the newly loaded page
        this._savePageThrottler = new ThrottledAction(500)

        const pageData = await this._api.restGet<ItemRequestResponse>(`pages/${name}`, useCache);
        if(pageData.errorMessage) {
            this.recentError = pageData.errorMessage;
        }
        else if(!pageData.data) {
            const freshPage = new PageModel(this);
            freshPage.name = name;
            action (()=>{this.page = freshPage; })()
        }
        else {
            try {
                action(()=>{
                    const loadedPage = this._serializer.parse<PageModel>(pageData.data.data);
                    this.page = loadedPage;
                    this.page.version = pageData.data.version;
                    //console.log(`Page loaded: ${this.page.name}.${this.page.version} [${this.page.widgetIds.join(',')}]`)
                    setTimeout(() => {this.refreshWidgets(this.page)}, 100)
                })()
            }
            catch(err)
            {
                console.log(`${err}\nJSON:${pageData.data.data}`)
                console.log(`STACK: ${err.stack}`)
                if(useCache) setTimeout(()=> this.loadPage(name, false),1)
                else this.recentError = `Could not load page ${name}`           
            }
        
        }        
    }

    // -------------------------------------------------------------------
    // refreshWidgets - ask the server for widget versions and reload the
    //                  content fromt he server if the widget is not the
    //                  latest version
    // -------------------------------------------------------------------
    async refreshWidgets(page: PageModel)
    {
        const response = await this._api.restGet<WidgetVersionResponse>(
            `query?type=widgetversions&ids=${page.widgetIds.join(',')}`, false);

        if(response.errorMessage) {
            this.recentError = response.errorMessage;
        }
        else {
            response.data.forEach(async(i) => {
                const widget = this.getWidget(i.id);
                if(widget.version !== i.version) {
                    console.log(`Loading from server:  widget ${i.id}.${i.version} because version is ${widget.version}`)
                    this.loadWidgetContent(widget, false);
                }
            })
        }
           
    }

    // -------------------------------------------------------------------
    // loadWidget - restore widget contents from server 
    // -------------------------------------------------------------------
    async loadWidgetContent(widget: WidgetModel, useCache: boolean = true)
    {
        let response =  await this._api.restGet<ItemRequestResponse>(`widgets/${widget.id}`, useCache);
        if(response.data)
        {
            const loadedWidget = JSON.parse(response.data.data);
            if(!loadedWidget) throw Error(`Data was not a Widget: ${response.data}`) 
            let loadedData = loadedWidget.data

            loadedWidget.data = this._typeHelper.constructType(dataTypeForWidgetType(loadedWidget._myType)) as any;
            Object.assign(loadedWidget.data, loadedData);
            widget.loadFrom(loadedWidget); 
            widget.version = response.data.version;
            //console.log(`Widget loaded: ${widget.id}.${widget.version}`)
        }
        else if(response.errorMessage) {
            console.log(`No data for ${widget.id}:  ${response.errorMessage}`)
        }
    }

    private _widgetContent = new Map<string, WidgetModel>()

    // -------------------------------------------------------------------
    // getWidgetLoadLater 
    // -------------------------------------------------------------------
    getWidget(widgetId: string)
    {
        if(!this._widgetContent.has(widgetId)) {
            const newContent = new WidgetModel(this, widgetId);
            this._widgetContent.set(widgetId, newContent)
            this.loadWidgetContent(newContent)
        }

        return this._widgetContent.get(widgetId)
    }

    // -------------------------------------------------------------------
    // createBlankWidgetContent 
    // -------------------------------------------------------------------
    getBlankData(widgetType: WidgetType)
    {
        return this._typeHelper.constructType(dataTypeForWidgetType(widgetType)) as any;
    }
  
    // -------------------------------------------------------------------
    // reportError
    // -------------------------------------------------------------------
    reportError(label: string, err: any)
    {
        this.recentError = `${label}: ${err}`
        console.log(this.recentError)
    }

    // -------------------------------------------------------------------
    // savePage 
    // -------------------------------------------------------------------
    savePage(pageToSave: PageModel)
    {
        const originalVersion = pageToSave.version;
        console.log(`Saving page ${pageToSave.name}.${pageToSave.version}`)
        pageToSave.version = WIDGET_VERSION_ISLOADING;
        this._savePageThrottler.run(async () => {
            const payload = this._serializer.stringify({id: 0, data: pageToSave})
            const response = await this._api.restPost<StoreResponse>(`pages/${pageToSave.name}`, payload)
                .catch(err => ({errorMessage: err} as StoreResponse))
            if(response.errorMessage)
            {
                this.reportError("Save Page", response.errorMessage)
                pageToSave.version = originalVersion
            }
            else {
                pageToSave.version = response.data
                console.log(`New Page Version: ${pageToSave.version} (${JSON.stringify(response)})`)
            }
        });
    }

    // -------------------------------------------------------------------
    // saveWidgetData 
    // -------------------------------------------------------------------
    async saveWidgetData(widget: WidgetModel)
    {
        const originalVersion = widget.version;
        const payload = this._serializer.stringify({id: 0, data: widget});
        widget.version = WIDGET_VERSION_ISLOADING;
        console.log(`Writing widget: ${widget.id}`)
        const response = await this._api.restPost<StoreResponse>(`widgets/${widget.id}`, payload)
            .catch(err => ({errorMessage: err} as StoreResponse))

        if(response.errorMessage)
        {
            this.reportError("Save Widget", response.errorMessage)
            widget.version = originalVersion;
        }
        else {
            widget.version = response.data!
            console.log(`New Widget Version: ${widget.version}`)
        }
    }
}

