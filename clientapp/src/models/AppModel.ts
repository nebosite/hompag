
import { makeObservable, observable } from "mobx";
import { PageModel } from "./PageModel";


export class PageItem {
    i: string;
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number; 
}


// -------------------------------------------------------------------
// The AppModel
// -------------------------------------------------------------------
export class AppModel {
    @observable serverStatus:any = null;
    @observable pages: PageModel[] = observable<PageModel>([])

    //private _localStorage:ILocalStorage;
    dataLoader: Promise<void>

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        this.pages.push(new PageModel())
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
 