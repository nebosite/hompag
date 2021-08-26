import { WidgetContainer } from "models/WidgetContainer";
import React from "react";

export default class WidgetDefault 
extends React.Component<{context: WidgetContainer}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render = () => <div> 
                    {
                        this.props.context.ref_widget?.widgetType
                            ? "I am a {this.props.context.ref_widget.widgetType}"
                            : ""
                    }
             </div> 
}