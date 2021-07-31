import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";

@observer
export default class WidgetDefault 
extends React.Component<{pageItem: WidgetContainer}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        return (
            <div>
                I appear to be an unknown kind of widget: {this.props.pageItem.ref_widget.widgetType}
            </div> 
        );
    }; 
}