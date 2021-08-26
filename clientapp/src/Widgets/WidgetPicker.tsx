import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import { registerWidget, WidgetType } from "widgetLibrary";
import Combobox from "../Components/ComboBox";

export class WidgetPickerData { }

@observer
export default class WidgetPicker 
extends React.Component<{context: WidgetContainer}> 
{    
    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        registerWidget(WidgetType.Picker, c => <WidgetPicker context={c} />, WidgetPickerData.name, () => new WidgetPickerData())
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const widget = this.props.context.ref_widget;
        const hideTypes = [WidgetType._TEMPLATE_, WidgetType.Picker, WidgetType.Editor]

        const selectWidgetType = (selectedType: string) =>
        {
            widget.widgetType = selectedType as WidgetType;
        }

        const pickableItmes = Object.keys(WidgetType)
                                .filter(k => hideTypes.indexOf(k as WidgetType) === -1)
                                .map(k => {return {value: k, label: k}})
        return (
            <div style={{height:"500px", fontSize:"10px"}}>
                <Combobox
                    itemsSource={pickableItmes}
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

