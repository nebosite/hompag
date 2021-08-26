import { registerType } from "models/hompagTypeHelper";
import { WidgetContainer } from "models/WidgetContainer";
import WidgetPicker from "Widgets/WidgetPicker";
import WidgetRichText from "Widgets/WidgetRichText";
import WidgetSearch from "Widgets/WidgetSearch";
import WidgetSpotify from "Widgets/WidgetSpotify"
import Widget_TEMPLATE_ from "Widgets/_WidgetTEMPLATE";

// -------------------------------------------------------------------
// registerWidgets - This is where we expose widget types to the framework
// -------------------------------------------------------------------
export function registerWidgets()
{
    Widget_TEMPLATE_.register();
    WidgetPicker.register();
    WidgetSpotify.register();
    WidgetRichText.register();
    WidgetSearch.register();
}

export enum WidgetType
{
    _TEMPLATE_ = "Template",
    Picker = "Picker",
    Editor = "Editor",
    RichText = "RichText",
    Search = "Search",
    Spotify = "Spotify"
}


const knownDataTypes = new Map<WidgetType, string>()
export const dataTypeForWidgetType = (widgetType: WidgetType) => knownDataTypes.get(widgetType);

const knownComponents = new Map<WidgetType, (context: WidgetContainer) => JSX.Element>()

export function registerWidget(
    type: WidgetType, 
    render:(context: WidgetContainer) => JSX.Element,
    dataTypeName: string | undefined,  
    dataTypeFactory: () => any | undefined)
{
    knownComponents.set(type, render);
    if(dataTypeName){
        knownDataTypes.set(type, dataTypeName);
        registerType(dataTypeName, dataTypeFactory)
    }    
}

export function renderWidget(type: WidgetType, context: WidgetContainer)
{
    const render = knownComponents.get(type);
    if(!render) return null;
    return render(context);
}

