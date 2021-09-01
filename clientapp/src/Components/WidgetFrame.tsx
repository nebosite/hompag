import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import styles from '../AppStyles.module.css';
import {GoEllipsis} from 'react-icons/go' 
import { action } from "mobx";

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

        return (
            <div 
                className={`${styles.widgetFrame} ${(context.state_configuring ? styles.configHighlight : "")}`}
                style={{
                    height: `${context.h * context.parentPage.rowHeight-4}px`,
                    width: `${context.w * context.parentPage.columnWidth-4}px`,
                    background: color(context.backGroundColorIndex, context.backGroundColorValue),
                    color: color(context.foregroundColorIndex, context.foregroundColorValue),
                    boxShadow: `0px 0px 2px ${color(context.backGroundColorIndex, context.backGroundColorValue)}`
                }} 
            >
                <div className={`${styles.Interior}`}>
                    <div className={`${styles.DragHandle} widgetFrameDragHandleTag`} />
                    <div className={`${styles.ConfigButton}`} 
                        onClick={()=>action(()=>context.state_configuring = true)()}><GoEllipsis /></div>
                    <div className={`${styles.Contents}`}
                        style={{
                            height: `${context.h * context.parentPage.rowHeight-6}px`,
                        }}
                    >
                        <div className={styles.Filler2}> 
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </div> 
        );
    };
}

