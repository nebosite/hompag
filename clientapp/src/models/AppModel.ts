
import { makeObservable, observable } from "mobx";


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
    get columnWidth() {return this.pageWidth / this.columnCount;}
    @observable columnCount = 12;
    @observable rowHeight = 30;
    @observable pageWidth = 1200;

    //private _localStorage:ILocalStorage;
    dataLoader: Promise<void>
    pageItems: PageItem[] = observable<PageItem>([])

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        this.pageItems.push({i: 'a', x: 0, y: 0, w: 1, h: 2})
        this.pageItems.push({i: 'b', x: 1, y: 0, w: 3, h: 2})
        this.pageItems.push({i: 'c', x: 4, y: 0, w: 1, h: 2})

    
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

    addItem(rawX: number, rawY: number) {
        console.log(`Adding: ${rawX},${rawY}`)
        const column = Math.floor(rawX/this.columnWidth); 
        const row = Math.floor(rawY/this.rowHeight);

        const newItem = new PageItem();
        newItem.i = Date.now().toString();
        newItem.x = column;
        newItem.y = row;
        newItem.w = 3;
        newItem.h = 1;
        this.pageItems.push(newItem) 
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
 