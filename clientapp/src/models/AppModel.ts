
import BruteForceSerializer from "helpers/BruteForceSerializer";
import { RestHelper } from "helpers/RestHelper";
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

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(pageName: string)
    {
        makeObservable(this);
        registerGlobalItem("theApp", this);
        this._typeHelper = new hompagTypeHelper();
        this._serializer = new BruteForceSerializer(this._typeHelper)

        setTimeout(async ()=>{
            const pageData = await this._api.restGet<PageRequestResponse>(`pages/${pageName}`);
            if(pageData.errorMessage) {
                this.pageError = pageData.errorMessage;
            }
            else if(!pageData.data) {
                const freshPage = new PageModel(this);
                freshPage.name = pageName;
                this.page = freshPage;
            }
            else {
                //console.log(`TRY: '${pageData.data}'`)
                action(async ()=>{
                    this.page = await this.reconstitutePage(pageData.data);
                    this._isLoaded = true;
                })()
            }
        },1)
    }

    // -------------------------------------------------------------------
    // reconstitutePage 
    // -------------------------------------------------------------------
    async reconstitutePage(pageJson: string)
    {
        const output = this._serializer.parse<PageModel>(pageJson);

        output.widgets.forEach(async w => {
            let response =  await this._api.restGet<PageRequestResponse>(`widgets/${w.i}`);
            let dataBlob:any = null;
            if(response.data)
            {
                dataBlob = JSON.parse(response.data);    
            }
            const data = this._typeHelper.constructType(dataTypeForWidgetType(w._myType)) as any;
            Object.assign(data, dataBlob);
            data.ref_parent = w;
            w.ref_data = data;
            
        })

        return output;
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
        console.log("Saving page...")
        this._api.restPost(`pages/${this.page.name}`, this._serializer.stringify(this.page))
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
 