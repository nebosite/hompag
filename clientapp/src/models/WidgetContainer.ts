import { registerType } from "./hompagTypeHelper";
import { observable, makeObservable, reaction } from "mobx";
import { PageModel } from "./PageModel";
import { ColorIndex, ColorValue } from "helpers/ColorTool";

registerType("WidgetContainer", bag => new WidgetContainer())

// -------------------------------------------------------------------
// Generic class for holding widget data
// -------------------------------------------------------------------
export class WidgetContainer {
    __t = "WidgetContainer" // Help the serializer know the type when code is minimized
    @observable widgetId: string = undefined; 
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number;
    @observable backGroundColorValue = ColorValue.V7_ExtraBright
    @observable backGroundColorIndex = ColorIndex.Background
    @observable foregroundColorValue = ColorValue.V3_Shaded
    @observable foregroundColorIndex = ColorIndex.Foreground

    @observable state_configuring = false;

    get ref_widget() { return this.parentPage?.getWidget(this.widgetId)}

    get colorTheme() { 
        const returnMe = this.parentPage?.colorTheme;
        return returnMe;
    }

    @observable parentPage: PageModel;
    getKey = () => `${this.x},${this.y},${this.w},${this.h}`

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(parent: PageModel = null, widgetId: string | undefined = undefined)
    {
        makeObservable(this);
        this.widgetId = widgetId;
        this.parentPage = parent;

        reaction( 
            () => [this.x, this.y, this.w, this.h, this.foregroundColorIndex, this.foregroundColorValue,
                    this.backGroundColorIndex, this.backGroundColorValue],
            () => this.parentPage.save()
        )
    }

    // -------------------------------------------------------------------
    // deleteMe 
    // -------------------------------------------------------------------
    deleteMe = () => {
        this.parentPage.removeWidget(this);
    }

    // -------------------------------------------------------------------
    // getStateMaker 
    // -------------------------------------------------------------------
    getStateMaker() {
        return this.parentPage.getStateMaker(this.widgetId);
    }

}