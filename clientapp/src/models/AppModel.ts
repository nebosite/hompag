
import BruteForceSerializer from "helpers/BruteForceSerializer";
import { IDataChangeListener, WebSocketListener } from "helpers/DataChangeListener";
import { RestHelper } from "helpers/RestHelper";
import { ThrottledAction } from "helpers/ThrottledAction";
import { action, makeObservable, observable } from "mobx";
import { hompagTypeHelper, registerGlobalItem } from "./hompagTypeHelper";
import { PageModel } from "./PageModel";
import { dataTypeForWidgetType, WidgetModel } from "./WidgetModel"; 



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
    private _isLoaded = false;
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
        this._dataChangeListener = new WebSocketListener((type, id) => {
            if(type === "page" && this.page.name === id)
            {
                this.loadPage(id);           
            }
            else if(type === "widget") {
                this.page.updateWidget(id);
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

        this._isLoaded = false;
        const pageData = await this._api.restGet<PageRequestResponse>(`pages/${name}`);
        if(pageData.errorMessage) {
            this.pageError = pageData.errorMessage;
        }
        else if(!pageData.data) {
            const freshPage = new PageModel(this);
            freshPage.name = name;
            this.page = freshPage;
            this._isLoaded = true;
        }
        else {
            //console.log(`TRY: '${pageData.data}'`)
            const loadedPage = await this.reconstitutePage(pageData.data);
            action(()=>{
                this.page = loadedPage;
                console.log(`PAGE LOADED ${loadedPage.name}`)
                this._isLoaded = true;
            })()
        }        
    }

    // -------------------------------------------------------------------
    // reconstitutePage 
    // -------------------------------------------------------------------
    async reconstitutePage(pageJson: string)
    {
        let output:PageModel = null;
        await new Promise<void>((resolve) => {
            action(async () =>{
                try {
                    output = await this._serializer.parse<PageModel>(pageJson);
                }
                catch(err)
                {
                    console.log(`${err}\nJSON:${pageJson}`)
                }
                await Promise.all(output.widgets.map((w) => this.loadWidget(w)));
                resolve();
            })()
        }) 
        return output;
    }

    // -------------------------------------------------------------------
    // loadWidget - restore widget contents from server 
    // -------------------------------------------------------------------
    async loadWidget(w: WidgetModel)
    {
        console.log(`WIDGET START: ${w.i}`)
        let response =  await this._api.restGet<PageRequestResponse>(`widgets/${w.i}`);
        let dataBlob:any = null;
        if(response.data)
        {
            dataBlob = JSON.parse(response.data);    
        }
        const data = this._typeHelper.constructType(dataTypeForWidgetType(w._myType)) as any;
        Object.assign(data, dataBlob);
        data.ref_parent = w;
        action(()=>{w.data = data})()
        console.log(`WIDGET FINISH: ${w.i}`)

    }

    // -------------------------------------------------------------------
    // getBlankWidgetData 
    // -------------------------------------------------------------------
    getBlankWidgetData(widget: WidgetModel)
    {
        const output = this._typeHelper.constructType(dataTypeForWidgetType(widget.myType)) as any;
        output.ref_parent = widget;
        return output;
    }

    // -------------------------------------------------------------------
    // savePage 
    // -------------------------------------------------------------------
    savePage()
    {
        if(!this._isLoaded || !this.page)
        {
            return;
        }

        const pageToSave = this.page;
        console.log(`Saving page ${pageToSave.name}`)
        this._savePageThrottler.run(() => {
            this._api.restPost(`pages/${pageToSave.name}`, this._serializer.stringify(pageToSave))
        });
    }

    // -------------------------------------------------------------------
    // deleteWidget 
    // -------------------------------------------------------------------
    deleteWidget(id: string)
    {
        this.page.deleteWidget(id);
    }

    // -------------------------------------------------------------------
    // saveWidgetData 
    // -------------------------------------------------------------------
    saveWidgetData(id: string, data: any)
    {
        if(!this._isLoaded || !this.page)
        {
            return;
        }
        console.log("Saving widget data...")
        this._api.restPost(`widgets/${id}`, this._serializer.stringify(data))
    }


    // // -------------------------------------------------------------------
    // // pingServer
    // // -------------------------------------------------------------------
    // pingServer()
    // {
    //     setTimeout(async () =>{
    //         this.serverStatus = await this.dbApi.restGet("am_i_healthy");
    //     },500);
    // }

}
 