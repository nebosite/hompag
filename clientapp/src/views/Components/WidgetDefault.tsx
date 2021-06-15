import { observer } from "mobx-react";
import { WidgetModel } from "models/WidgetModel";
import React from "react";

@observer
export default class WidgetDefault 
extends React.Component<{pageItem: WidgetModel}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        return (
            <div>
                I appear to be an unknown kind of widget: {this.props.pageItem.myType}
            </div> 
        );
    }; 
}