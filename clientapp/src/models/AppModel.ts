
import BruteForceSerializer from "helpers/BruteForceSerializer";
import { IDataChangeListener, WebSocketListener } from "helpers/DataChangeListener";
import { RestHelper } from "helpers/RestHelper";
import { ThrottledAction } from "helpers/ThrottledAction";
import { action, makeObservable, observable } from "mobx";
import { hompagTypeHelper, registerGlobalItem } from "./hompagTypeHelper";
import { PageModel } from "./PageModel";
import { WidgetModel, WidgetType } from "./WidgetModel";
import { dataTypeForWidgetType } from "./WidgetContainer"; 



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

// -------------------------------------------------------------------
// The AppModel
// -------------------------------------------------------------------
export class AppModel {
    @observable serverStatus:any = null;
    @observable page: PageModel;
    @observable recentError?: string;

    //private _localStorage:ILocalStorage;
    private _api = new RestHelper("/api/");
    private _serializer: BruteForceSerializer;
    private _typeHelper: hompagTypeHelper;
    private _dataChangeListener: IDataChangeListener
    private _savePageThrottler = new ThrottledAction(500)

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(pageName: string)
    {
        makeObservable(this);
        registerGlobalItem("theApp", this);
        this._typeHelper = new hompagTypeHelper();
        this._serializer = new BruteForceSerializer(this._typeHelper)
        this._dataChangeListener = new WebSocketListener((type, itemId, version) => {

            console.log(`Data change: ${type}.${itemId}.${version}`)
            if(type === "page" && this.page.name === itemId && this.page.version !== version) {
                this.loadPage(itemId);           
            }
            else if(type === "widget") {
                const foundWidget = this.getWidget(itemId,false)
                if(foundWidget && foundWidget.version !== version)
                {
                    this.loadWidgetContent(foundWidget)   
                }
            } 
        })
        if(!this._dataChangeListener) console.log("Just shutting up the compiler")

        setTimeout( ()=> this.loadPage(pageName),1)
    }

    // -------------------------------------------------------------------
    // loadPage 
    // -------------------------------------------------------------------
    async loadPage(name: string)
    {
        console.log("Entering loadPage()")

        // Allow any active page saves to complete by adding a new throttler
        // for the newly loaded page
        this._savePageThrottler = new ThrottledAction(500)

        const pageData = await this._api.restGet<ItemRequestResponse>(`pages/${name}`);
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
                    console.log(`PAGE LOADED ${loadedPage.name}.${loadedPage.version}`)
                })()
            }
            catch(err)
            {
                console.log(`${err}\nJSON:${pageData.data}`)
                console.log(`STACK: ${err.stack}`)
            }
        
        }        
    }

    // -------------------------------------------------------------------
    // loadWidget - restore widget contents from server 
    // -------------------------------------------------------------------
    async loadWidgetContent(widget: WidgetModel)
    {
        let response =  await this._api.restGet<ItemRequestResponse>(`widgets/${widget.id}`);
        if(response.data)
        {
            const loadedWidget = JSON.parse(response.data.data);
            if(!loadedWidget) throw Error(`Data was not a Widget: ${response.data}`)
            let loadedData = loadedWidget.data

            loadedWidget.data = this._typeHelper.constructType(dataTypeForWidgetType(loadedWidget._myType)) as any;
            Object.assign(loadedWidget.data, loadedData);
            widget.loadFrom(loadedWidget); 
            widget.version = response.data.version;
            console.log(`Widget loaded: ${widget.id}.${widget.version}`)
        }
        else if(response.errorMessage) {
            console.log(`No data for ${widget.id}:  ${response.errorMessage}`)
        }
    }

    private _widgetContent = new Map<string, WidgetModel>()

    // -------------------------------------------------------------------
    // getWidget
    // -------------------------------------------------------------------
    getWidget(widgetId: string, loadIfNotFound: boolean)
    {
        if(!this._widgetContent.has(widgetId)){
            const newContent = new WidgetModel(this, widgetId);
            this._widgetContent.set(widgetId, newContent)
            if(loadIfNotFound) {
                this.loadWidgetContent(newContent)
            }
        }

        return this._widgetContent.get(widgetId);
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
        console.log(`Saving page ${pageToSave.name}`)
        this._savePageThrottler.run(async () => {
            const payload = this._serializer.stringify({id: 0, data: pageToSave})
            const response = await this._api.restPost<StoreResponse>(`pages/${pageToSave.name}`, payload)
                .catch(err => ({errorMessage: err} as StoreResponse))
            if(response.errorMessage)
            {
                this.reportError("Save Page", response.errorMessage)
            }
            else {
                pageToSave.version = response.data!
                console.log(`New Page Version: ${pageToSave.version}`)
            }
        });
    }

    // -------------------------------------------------------------------
    // saveWidgetData 
    // -------------------------------------------------------------------
    async saveWidgetData(widget: WidgetModel)
    {
        const payload = this._serializer.stringify({id: 0, data: widget});
        console.log(`Writing widget: ${widget.id}`)
        const response = await this._api.restPost<StoreResponse>(`widgets/${widget.id}`, payload)
            .catch(err => ({errorMessage: err} as StoreResponse))

        if(response.errorMessage)
        {
            this.reportError("Save Widget", response.errorMessage)
        }
        else {
            widget.version = response.data!
        }
    }
}

