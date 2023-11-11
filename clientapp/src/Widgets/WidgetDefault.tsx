import { WidgetContainer } from "models/WidgetContainer";
import WidgetBase from "./WidgetBase";

export default class WidgetDefault 
extends WidgetBase<{context: WidgetContainer, scale: number}> 
{    
    // -------------------------------------------------------------------
    // renderContent
    // -------------------------------------------------------------------
    renderContent = () => <div> 
                    {
                        this.props.context.ref_widget?.widgetType
                            ? `I am a ${this.props.context.ref_widget.widgetType}`
                            : ""
                    }
             </div> 

    renderConfigUI = () => <div></div>
}