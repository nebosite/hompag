import { registerType } from "./hompagTypeHelper";
import { ThrottledAction } from "helpers/ThrottledAction";
import { observable, action, makeObservable, reaction } from "mobx";
import { AppModel } from "./AppModel";

export enum WidgetType
{
    Picker = "Picker",
    Editor = "Editor"
}

registerType("WidgetModel", bag => new WidgetModel(bag.get("theApp")))

const knownDataTypes = new Map<WidgetType, string>()
export const registerDataTypeForWidgetType =(widgetType: WidgetType, dataType: string) =>
{
    knownDataTypes.set(widgetType, dataType);
}
export const dataTypeForWidgetType = (widgetType: WidgetType) => knownDataTypes.get(widgetType);


// -------------------------------------------------------------------
// Generic class for holding widget data
// -------------------------------------------------------------------
export class WidgetModel {
    i: string = `${Date.now()}${Math.random()}`;
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number;
    ref_data: any = null;

    @observable _myType: WidgetType = WidgetType.Picker;
    get myType() { return this._myType}
    set myType(value: WidgetType) { action(()=> {
            this._myType = value;
            this.ref_data = this.ref_App.getBlankWidgetData(this)
        })(); 
    }

    get colorTheme() { 
        const returnMe = this.ref_App?.page?.colorTheme;
        return returnMe;
    }

    ref_App: AppModel;
    private ref_saveThrottler = new ThrottledAction(500);

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(app: AppModel)
    {
        makeObservable(this);
        this.ref_App = app;

        reaction( 
            ()=>  [this.x, this.y, this.w, this.h, this._myType],
            () => {
                console.log(`Reaction: ${this.x},${this.y}`)
                this.ref_App.savePage();
            }
        )
    }

    // -------------------------------------------------------------------
    // deleteMe 
    // -------------------------------------------------------------------
    deleteMe = () => {
        this.ref_App.deleteWidget(this.i);
    }

    // -------------------------------------------------------------------
    // trigger data save for this widget 
    // -------------------------------------------------------------------
    saveData()
    {
        this.ref_saveThrottler.run(()=>{this.ref_App.saveWidgetData(this.i, this.ref_data)})
    }

}