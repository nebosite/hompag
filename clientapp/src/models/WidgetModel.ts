import { ThrottledAction } from "helpers/ThrottledAction";
import { observable, action, makeObservable, reaction } from "mobx";
import { AppModel } from "./AppModel";

export enum WidgetType
{
    Picker = "Picker",
    Editor = "Editor"
}

let debugId = 0;

// -------------------------------------------------------------------
// Generic class for holding widget data
// -------------------------------------------------------------------
export class WidgetModel {
    i: string = `${Date.now()}${Math.random()}`;
    debugId= `${debugId++}`
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number;
    @observable data: any;

    @observable _myType: WidgetType = WidgetType.Picker;
    get myType() { return this._myType}
    set myType(value: WidgetType) { action(()=>this._myType = value)(); }

    get colorTheme() { return this.ref_App.page.colorTheme;}

    ref_App: AppModel;
    ref_ThrottledSavePage: ThrottledAction;

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(app: AppModel)
    {
        makeObservable(this);
        this.ref_App = app;
        this.ref_ThrottledSavePage = new ThrottledAction(()=> app.savePage(), 50)

        reaction( 
            ()=>  [this.x, this.y, this.w, this.h, this.data, this._myType],
            () => {
                this.ref_ThrottledSavePage.run();
            }
        )

    }

    // -------------------------------------------------------------------
    // deleteMe 
    // -------------------------------------------------------------------
    deleteMe = () => {
        this.ref_App.deleteWidget(this.i);
    }

}