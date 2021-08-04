import { registerType } from "./hompagTypeHelper";
import { observable, makeObservable, reaction } from "mobx";
import { PageModel } from "./PageModel";
import { generateStringId } from "helpers/randomHelper";
import { WidgetType } from "./WidgetModel";
import { ColorIndex, ColorValue } from "helpers/ColorTool";

registerType("WidgetContainer", bag => new WidgetContainer())

const knownDataTypes = new Map<WidgetType, string>()
export const registerDataTypeForWidgetType =(widgetType: WidgetType, dataType: string) =>
{
    console.log(`Registering data type '${dataType}' for widget type '${widgetType}'`)
    knownDataTypes.set(widgetType, dataType);
}
export const dataTypeForWidgetType = (widgetType: WidgetType) => knownDataTypes.get(widgetType);


// -------------------------------------------------------------------
// Generic class for holding widget data
// -------------------------------------------------------------------
export class WidgetContainer {
    @observable widgetId: string = generateStringId(); 
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number;
    @observable backGroundColorValue = ColorValue.V7_ExtraBright
    @observable backGroundColorIndex = ColorIndex.Background
    @observable foregroundColorValue = ColorValue.V1_ExtraDark
    @observable foregroundColorIndex = ColorIndex.Foreground

    get ref_widget() {return this.parentPage.getWidget(this.widgetId)}

    get colorTheme() { 
        const returnMe = this.parentPage?.colorTheme;
        return returnMe;
    }

    @observable parentPage: PageModel;
    getKey = () => `${this.x},${this.y},${this.w},${this.h}`

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(parent: PageModel = null)
    {
        makeObservable(this);
        this.parentPage = parent;
        this.parentPage?.getWidget(this.widgetId, false);

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

}