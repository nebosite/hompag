import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import styles from '../AppStyles.module.css';

@inject("appModel")
@observer
export class WidgetFrame 
extends React.Component<
    {context: WidgetContainer}, 
    {configVisible: boolean, hoverForeground?: {i: ColorIndex, v: ColorValue}, hoverBackground?: {i: ColorIndex, v: ColorValue} }> 
{    
    constructor(props: {context: WidgetContainer})
    {
        super(props);
        this.state = {configVisible: false}
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const color = (i: ColorIndex,v: ColorValue) => context.colorTheme.color(i,v);
        const widgetStyle:any = {
            background: color(context.backGroundColorIndex, context.backGroundColorValue),
            color: color(context.foregroundColorIndex, context.foregroundColorValue)
        }

        return (
            <div className={`${styles.widgetFrame} ${(context.state_configuring ? styles.configHighlight : "")}`}>
                <div className={`${styles.Interior} ${styles.Filler}`}>
                    <div className={`${styles.Filler}`} 
                        style={widgetStyle}
                        >
                        <div className={`${styles.DragHandle} widgetFrameDragHandleTag`} />
                        <div>
                            <div className={`${styles.ConfigButton}`} 
                                onClick={()=>context.state_configuring = true}>...</div>
                            <div className={`${styles.ChildBorder}`}>
                                {this.props.children}
                            </div>
                        </div> 
                    </div>
                </div>
            </div> 
        );
    };
}
