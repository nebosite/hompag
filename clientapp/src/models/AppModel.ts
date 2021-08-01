
import BruteForceSerializer from "helpers/BruteForceSerializer";
import { IDataChangeListener, WebSocketListener } from "helpers/DataChangeListener";
import { RestHelper } from "helpers/RestHelper";
import { ThrottledAction } from "helpers/ThrottledAction";
import { action, makeObservable, observable } from "mobx";
import { hompagTypeHelper, registerGlobalItem } from "./hompagTypeHelper";
import { PageModel } from "./PageModel";
import { WidgetModel, WidgetType } from "./WidgetModel";
import { dataTypeForWidgetType } from "./WidgetContainer"; 



interface PageRequestResponse
{
    data: any;
    errorMessage: string;
}

// -------------------------------------------------------------------
// The AppModel
// -------------------------------------------------------------------
export class AppModel {
    @observable serverStatus:any = null;
    @observable page: PageModel;
    @observable pageError?: string;

    //private _localStorage:ILocalStorage;
    private _api = new RestHelper("/api/");
    private _serializer: BruteForceSerializer;
    private _typeHelper: hompagTypeHelper;
    private _dataChangeListener: IDataChangeListener
    private _savePageThrottler = new ThrottledAction(500)
    private _reportedSaves = new Map<string,string>()

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(pageName: string)
    {
        makeObservable(this);
        registerGlobalItem("theApp", this);
        this._typeHelper = new hompagTypeHelper();
        this._serializer = new BruteForceSerializer(this._typeHelper)
        this._dataChangeListener = new WebSocketListener((type, itemId, updateId) => {
            if(!this._reportedSaves.has(updateId))
            {
                if(type === "page" && this.page?.name === itemId)
                {
                    this.loadPage(itemId);           
                }
                else if(type === "widget") {
                    this.loadWidgetContent(this.getWidget(itemId, false))
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

        const pageData = await this._api.restGet<PageRequestResponse>(`pages/${name}`);
        if(pageData.errorMessage) {
            this.pageError = pageData.errorMessage;
        }
        else if(!pageData.data) {
            const freshPage = new PageModel(this);
            freshPage.name = name;
            action (()=>{this.page = freshPage; })()
        }
        else {
            try {
                action(()=>{
                    const loadedPage = this._serializer.parse<PageModel>(pageData.data);
                    this.page = loadedPage;
                    console.log(`PAGE LOADED ${loadedPage.name}`)
                })()
            }
            catch(err)
            {
                console.log(`${err}\nJSON:${pageData.data}`)
                console.log(`STACK: ${err.stack}`)
            }
            
            

            // if(this.page && this.page.name === loadedPage.name)
            // {
            //     // for simple page reloads, don't need to download widget content
            //     loadedPage.widgets.forEach(w => {
            //         const oldWidget = this.page.widgets.find(ww => ww.i === w.i)
            //         if(oldWidget) w.ref_data = oldWidget.ref_data;
            //     })
            // }
            // else {
            //     await Promise.all(loadedPage.widgets.map((w) => this.loadWidget(w)));
            // }

        }        
    }

    // -------------------------------------------------------------------
    // loadWidget - restore widget contents from server 
    // -------------------------------------------------------------------
    async loadWidgetContent(widget: WidgetModel)
    {
        let response =  await this._api.restGet<PageRequestResponse>(`widgets/${widget.id}`);
        if(response.data)
        {
            const loadedWidget = JSON.parse(response.data);
            if(!loadedWidget) throw Error(`Data was not a Widget: ${response.data}`)
            let loadedData = loadedWidget.data

            loadedWidget.data = this._typeHelper.constructType(dataTypeForWidgetType(loadedWidget._myType)) as any;
            Object.assign(loadedWidget.data, loadedData);
            widget.loadFrom(loadedWidget); 
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
    // get a unique ID for this update 
    // -------------------------------------------------------------------
    getUpdateId()
    {
        const updateId = `${Date.now()}`;
        this._reportedSaves.set(updateId, updateId);
        return updateId
    }

    // -------------------------------------------------------------------
    // savePage 
    // -------------------------------------------------------------------
    savePage(page: PageModel)
    {
        const pageToSave = this.page;
        console.log(`Saving page ${pageToSave.name}`)
        this._savePageThrottler.run(() => {
            this._api.restPost(`pages/${pageToSave.name}`, this._serializer.stringify({id: this.getUpdateId(), data: pageToSave}))
        });
    }

    // -------------------------------------------------------------------
    // saveWidgetData 
    // -------------------------------------------------------------------
    saveWidgetData(widget: WidgetModel)
    {
        const payload = this._serializer.stringify({id: this.getUpdateId(), data: widget});
        console.log(`Writing widget: ${widget.id}`)
        this._api.restPost(`widgets/${widget.id}`, payload)
    }
}
 