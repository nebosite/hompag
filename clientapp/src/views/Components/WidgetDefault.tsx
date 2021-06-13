import { observer } from "mobx-react";
import { Widget } from "models/PageModel";
import React from "react";

@observer
export default class WidgetDefault 
extends React.Component<{pageItem: Widget}> 
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