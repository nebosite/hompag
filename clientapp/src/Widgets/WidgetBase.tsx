import { WidgetConfigurator } from "Components/WidgetConfigurator";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import { WidgetFrame } from "../Components/WidgetFrame";

// --------------------------------------------------------------------------------------------------------------------------------------
// WidgetBase - Common functionality for all widgets
// --------------------------------------------------------------------------------------------------------------------------------------
export default abstract class WidgetBase<T extends {context: WidgetContainer, scale: number}, StateT = {}>
extends React.Component<T, StateT > 
{     
    abstract renderContent(): JSX.Element 

    abstract renderConfigUI(): JSX.Element

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;

        return (
            <div>
                { context.state_configuring
                    ?   <WidgetConfigurator context={context} customUI={this.renderConfigUI()} />
                    :   null }
                <WidgetFrame context={context}>
                    {this.renderContent()}
                </WidgetFrame>  
            </div>
        );    
    };
}

