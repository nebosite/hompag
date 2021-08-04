import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetType } from "models/WidgetModel";
import React from "react";
import Combobox from "./ComboBox";

export class WidgetPickerData {

}

registerDataTypeForWidgetType(WidgetType.Picker, "WidgetPickerData");
registerType("WidgetPickerData", () => new WidgetPickerData())


@observer
export default class WidgetPicker 
extends React.Component<{context: WidgetContainer}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const widget = this.props.context.ref_widget;
        const hideTypes = [WidgetType.Picker, WidgetType.Editor]

        const selectWidgetType = (selectedType: string) =>
        {
            widget.widgetType = selectedType as WidgetType;
        }

        return (
            <div style={{height:"500px", fontSize:"10px"}}>
                <Combobox
                    itemsSource={Object.keys(WidgetType).filter(k => hideTypes.indexOf(k as WidgetType) === -1).map(k => {return {value: k, label: k}})}
                    onSelectValue={selected => selectWidgetType(selected)}
                    selectedItem={widget.widgetType}
                    placeholder="What am I?"
                    width="90%"
                    menuWidth="100%"
                    styleOverride={{fontSize: "12px"}}
                />  
            </div> 
        );
    };
}
