import { ThrottledAction } from "helpers/ThrottledAction";
import { action, makeObservable, observable } from "mobx";
import { AppModel } from "./AppModel";

export enum WidgetType
{
    Picker = "Picker",
    Editor = "Editor",
    RichText = "RichText",
    Search = "Search",
    Spotify = "Spotify"
}

export class WidgetModelData {
    ref_widgetParent: WidgetModel
    save() {
        this.ref_widgetParent.save();
    }
}

export class WidgetModel {
    id: string 
    alias: string = null
    @observable data: WidgetModelData = null

    @observable private _myType: WidgetType = WidgetType.Picker;
    get widgetType() { return this._myType}
    set widgetType(value: WidgetType) { action(()=> {
            if(this._myType === WidgetType.Picker)
            {
                this.data = this.ref_App.getBlankData(value)
                this.data.ref_widgetParent = this; 
                this._myType = value;
                console.log(`new type: ${value}`)
                this.save();
            }
            else {
                console.log(`WEIRD:  Widget trying to change type from ${this._myType} to ${value}`)
            }
        })(); 
    }

    private ref_App: AppModel
    private ref_saveThrottler = new ThrottledAction(500);
    private state_isLoading = false;

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(app: AppModel, id: string)
    {
        makeObservable(this);
        this.id = id;
        this.ref_App = app;

        // reaction( 
        //     ()=>  [this.data],
        //     () => this.save()
        // )    
    }

    // -------------------------------------------------------------------
    // Save Me 
    // -------------------------------------------------------------------
    save() {
        if(!this.state_isLoading) this.ref_saveThrottler.run(()=>this.ref_App.saveWidgetData(this))
    }

    // -------------------------------------------------------------------
    // loadFrom - copy contents from another widget
    // -------------------------------------------------------------------
    loadFrom(widget: WidgetModel)
    {
        this.state_isLoading = true;
        action(()=>{
            Object.assign(this, widget)
            this.data.ref_widgetParent = this;
            this.state_isLoading = false;
        })()

    }
}