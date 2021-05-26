
import { makeObservable, observable } from "mobx";





// -------------------------------------------------------------------
// The AppModel
// -------------------------------------------------------------------
export class AppModel {
    @observable serverStatus:any = null;
    //private _localStorage:ILocalStorage;
    dataLoader: Promise<void>

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        //this._localStorage = makeLocalStorage();
        
        // if(process.env.REACT_APP_USE_MOCK_SERVER)
        // {
        //     this.dbApi_cached = new MockServiceApi();
        //     this.dbApi = this.dbApi_cached;
        // }
        // else 
        // {
        //     //const server = "crashcow.paas.corp.adobe.com"
        //     const serverRoot = `/api/`
        //     this.dbApi_cached = new RestHelper(serverRoot,this._localStorage);
        //     this.dbApi = new RestHelper(serverRoot);
        // }


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
 