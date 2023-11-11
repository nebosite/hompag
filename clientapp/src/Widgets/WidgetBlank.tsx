import { WidgetContainer } from "models/WidgetContainer";
import WidgetBase from "./WidgetBase";

export default class WidgetBlank
extends WidgetBase<{context: WidgetContainer, scale: number}> 
{    
    renderContent = () => <div></div> 
    renderConfigUI = () => <div></div>
}