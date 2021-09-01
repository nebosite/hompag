import { WidgetConfigurator } from "Components/WidgetConfigurator";
import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import { WidgetFrame } from "../Components/WidgetFrame";

// --------------------------------------------------------------------------------------------------------------------------------------
// WidgetBase - Common functionality for all widgets
// --------------------------------------------------------------------------------------------------------------------------------------
export default abstract class WidgetBase<T extends {context: WidgetContainer}, StateT = {}>
extends React.Component<T, StateT > 
{     
    abstract renderContent(): JSX.Element 

    abstract renderConfigUI(): JSX.Element

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const style = {
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
            height: "100%"
        }
        return (
            <div>
                {context.state_configuring
                    ?   <WidgetConfigurator context={context} customUI={this.renderConfigUI()} />
                    : null}   
                <WidgetFrame context={context}>
                    <div style={style}>
                        {this.renderContent()}
                    </div>                       
                </WidgetFrame>           
          
            </div>

        );    
    };
}

