import { Combobox } from "evergreen-ui";
import { observer } from "mobx-react";
import { Widget, WidgetType } from "models/PageModel";
import React from "react";

@observer
export default class WidgetPicker 
extends React.Component<{context: Widget}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {

        const selectWidgetType = (selectedType: string) =>
        {
            console.log(`Selecting: ${selectedType}`)
            this.props.context.myType = selectedType as WidgetType;
        }

        return (
            <div>
                <Combobox
                    openOnFocus
                    items={Object.keys(WidgetType).filter(k => k !== WidgetType.Picker).map(k => k as string)}
                    onChange={selected => selectWidgetType(selected)}
                    placeholder="What am I?"
                    height={20}
                    width="100%"
                />  
            </div> 
        );
    };
}