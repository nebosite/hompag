import { RestHelper } from "helpers/RestHelper";
import { action, makeObservable, observable } from "mobx";


export interface ServerPagesResponse
{
    data: string[]
    errorMessage: string;
}

export class GetStartedModel
{
    @observable serverStatus:any = null;
    @observable pages:string[]

    //private _localStorage:ILocalStorage;
    private api = new RestHelper("/api/");

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        setTimeout(async ()=>
        {
            const result = await this.api.restGet<ServerPagesResponse>("pages")
            if(result.errorMessage) {
                console.log(`Error from the server: ${result.errorMessage}`)
            }
            else {
                action(()=>{this.pages = result.data})()
            }
        },1)
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