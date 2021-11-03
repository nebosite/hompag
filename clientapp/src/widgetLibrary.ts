import { registerType } from "models/hompagTypeHelper";
import { WidgetContainer } from "models/WidgetContainer";
import WidgetPicker from "Widgets/WidgetPicker";
import WidgetRichText from "Widgets/WidgetRichText";
import WidgetSearch from "Widgets/WidgetSearch";
import WidgetSpotify from "Widgets/WidgetSpotify"
import WidgetServerAction from "Widgets/WidgetServerAction";
import WidgetPinger from "Widgets/WidgetPinger";
import { WidgetModel } from "models/WidgetModel";
import WidgetDebug from "Widgets/Widget_DEBUG";
import WidgetStockTicker from "Widgets/WidgetStockTicker";

// -------------------------------------------------------------------
// registerWidgets - This is where we expose widget types to the framework
// -------------------------------------------------------------------
export function registerWidgets()
{
    WidgetModel.register();
    WidgetPicker.register();
    WidgetSpotify.register();
    WidgetRichText.register();
    WidgetSearch.register();
    WidgetServerAction.register();
    WidgetPinger.register();
    WidgetDebug.register();
    WidgetStockTicker.register();
}

export enum WidgetType
{
    _TEMPLATE_ = "_TEMPLATE_",
    Debug = "Debug",
    Picker = "Picker",
    Editor = "Editor",
    RichText = "RichText",
    Search = "Search",
    Spotify = "Spotify",
    ServerAction = "ServerAction",
    Pinger = "Pinger",
    StockTicker = "StockTicker",
}


const knownDataTypes = new Map<WidgetType, string>()
export const dataTypeForWidgetType = (widgetType: WidgetType) => knownDataTypes.get(widgetType);

const knownComponents = new Map<WidgetType, (context: WidgetContainer) => JSX.Element>()

export function registerWidget(
    type: WidgetType, 
    render:(context: WidgetContainer) => JSX.Element,
    dataTypeName: string | undefined,  
    dataTypeFactory:  (itemBag: Map<string,any>) => any | undefined)
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

