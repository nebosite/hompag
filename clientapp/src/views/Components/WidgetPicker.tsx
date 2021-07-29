import { Combobox } from "evergreen-ui";
import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetModel, WidgetType } from "models/WidgetModel";
import React from "react";

export class WidgetPickerData {

}

registerDataTypeForWidgetType(WidgetType.Picker, "WidgetPickerData");
registerType("WidgetPickerData", () => new WidgetPickerData())


@observer
export default class WidgetPicker 
extends React.Component<{context: WidgetModel}> 
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