
import BruteForceSerializer, { ITypeHelper } from "helpers/BruteForceSerializer";
import { ColorTool } from "helpers/ColorTool";
import { RestHelper } from "helpers/RestHelper";
import { action, makeObservable, observable } from "mobx";
import { PageModel, Widget } from "./PageModel";


class hompagTypeHelper implements ITypeHelper
{
    theApp: AppModel;
    constructor(theApp: AppModel)
    {
        this.theApp = theApp;
    }

    constructType(typeName: string): object {
        switch(typeName)
        {
            case "PageModel": return new PageModel(this.theApp);
            case "Widget": return new Widget(this.theApp);
            case "ColorTool": return new ColorTool([]);
            default: return null; 
        }
    }

    shouldStringify(typeName: string, propertyName: string, object: any): boolean {
        if(propertyName.startsWith("ref_")) return false;
        return true;
    }

    reconstitute(typeName: string, propertyName: string, rehydratedObject: any) {
        return rehydratedObject;
    }

}

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

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(pageName: string)
    {
        makeObservable(this);
        this._serializer = new BruteForceSerializer(new hompagTypeHelper(this))

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
                action(()=>{
                    this.page = this._serializer.parse<PageModel>(pageData.data);
                })()
            }
        },1)
    }


    // -------------------------------------------------------------------
    // savePage 
    // -------------------------------------------------------------------
    savePage()
    {
        if(!this.page)
        {
            return;
        }
        console.log("Saving page...")
        this._api.restPost(`pages/${this.page.name}`, this._serializer.stringify(this.page))
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
 