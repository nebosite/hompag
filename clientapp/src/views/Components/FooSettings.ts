import { action, makeObservable, observable } from "mobx";
import { UrlSettings } from "./UrlSettings";

// Defines allowed settings and gives their name on the query string
const SETTINGS_NAME = 
{
    ExampleSetting: "example",
}

// -------------------------------------------------------------------
// This accumulates rapid-fire actions into a single update when
// the state settles down.   For instance, it prevents immediately 
// updating a search result every time the user presses a key
// -------------------------------------------------------------------
class DelayThrottler
{
    private _throttleDelay_ms = 250;
    private _throttleQueue = new Array<()=>void>();
    private _currentId = 0;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(minDelay_ms: number = 250) {
        this._throttleDelay_ms = minDelay_ms;
    }

    // -------------------------------------------------------------------
    // doSomething
    // -------------------------------------------------------------------
    queueAction(doThis: () => void)
    {
        this._throttleQueue.push(doThis);
        const throttleId = ++this._currentId;
        //console.log(`Queue action ${throttleId}, ${this._currentId}`)    
       
        const throttleRelease = () => {      
            // If nothing has been added to the queue since we
            // got called last time, it is OK to execute the actions
            if(throttleId === this._currentId)
            {
                //console.log("execute throttle")
                const actionsToRun = this._throttleQueue.splice(0, this._throttleQueue.length);
                action(()=>{
                    actionsToRun.forEach(a => 
                        action(() => 
                        a()
                        )()
                    );
                })()
            }
        }

        setTimeout(throttleRelease, this._throttleDelay_ms);
    }

}

export class FooSettings
{
    settingBlob: any;
    private _throttler = new DelayThrottler(350);

    @observable _setting_example?: string;
    get example() { return this._setting_example;}
    set example(v: string | undefined) {this.updateMe(()=> this._setting_example = v)}

    constructor(){
        makeObservable(this);
        //autorun( () => { console.log(`>>>>>>>>>>>>>>>> AutoRun: ${this.searchBlob.failureHashText}`) } )
    }

    // -------------------------------------------------------------------
    // updateSearch Update a property and do a throttled update of the search
    // -------------------------------------------------------------------
    updateMe(updateValue: () => void) {
        action(updateValue)();
        this._throttler.queueAction(() => {
            const clone = (cloneMe: any) => {
                var copy:any = {}
                for (var propertyName in cloneMe) {
                    if (propertyName.indexOf("_search_") === 0) 
                    {
                        copy[propertyName.substr(8)] = cloneMe[propertyName]; 
                    }
                }
                return copy;
            }

            this.settingBlob = clone(this);
        })
    }

    // -------------------------------------------------------------------
    // asJson - return this object as a pure json text
    // -------------------------------------------------------------------
    asJson() {
        const miniQuery:any = {};
        const hasStringValue = (text: string) => {return text && text !== ""}
        if(hasStringValue(this.example)) miniQuery[SETTINGS_NAME.ExampleSetting] = this.example; 
        return JSON.stringify(miniQuery);
    }
}

export class FooParams
{
    @observable _current:FooSettings;
    get current() {return this._current;}

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(urlQuery?: UrlSettings) {
        if(urlQuery && urlQuery.isPresent())
        {
            makeObservable(this);

            const paramJson = urlQuery.get("_");
            if(paramJson && paramJson !== "{}") {
                this._current = new FooSettings();
                Object.assign(this._current, JSON.parse(paramJson));
            }
        }
        // autorun(() => { console.log(`    $$$$ Filters: ${this.filters.length}`) } )
        // autorun( () => { console.log(`    $$$$ Throttled Filters: ${this.throttledFiltersClone.length}`) } )
    }

    // -------------------------------------------------------------------
    // update url query with search settings
    // -------------------------------------------------------------------
    updateSearch = (urlQuery: UrlSettings) =>
    {
        let json = this._current.asJson();
        if(json === "{}") json = undefined;
        urlQuery.set("_", json);
        urlQuery.updatePageUrl();
    }
}

