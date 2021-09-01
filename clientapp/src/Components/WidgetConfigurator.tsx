import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import styles from '../AppStyles.module.css';
import Row from "./Row";
import {MdDeleteForever} from 'react-icons/md'
import {CgCloseR} from 'react-icons/cg'
import { action } from "mobx";


interface ColorPickerProps {
    context: WidgetContainer
    hoverColor(index: ColorIndex, value: ColorValue):void 
    pickColor(index: ColorIndex, value: ColorValue):void 
    cancelHover():void 
}
class ColorPicker 
extends React.Component<ColorPickerProps> {

    render() {
        const theme = this.props.context.colorTheme;
        const colorPicks = [0,1,2,3,4]
        const colorValues = [0,1,2,3,4,5,6,7,8]
        
        return (
            <div>
                {colorPicks.map(cp => 
                    (<div key={cp} className={styles.divRow}>
                        {
                            colorValues.map(cv => (
                                <div 
                                    key={cv} 
                                    onMouseEnter={()=>this.props.hoverColor(cp,cv)}
                                    onMouseLeave={()=>this.props.cancelHover()}
                                    onClick={()=>this.props.pickColor(cp,cv)}
                                    style={{width:"10px",height:"4px",background: theme.color(cp,cv)}}>

                                </div>))
                        }
                    </div>
                ))}
            </div> 
        );
    }
}

interface WidgetConfiguratorProps {
    context: WidgetContainer
    customUI?: JSX.Element
}

interface WidgetConfiguratorState     
{
    hoverForeground?: {i: ColorIndex, v: ColorValue}, 
    hoverBackground?: {i: ColorIndex, v: ColorValue} 
}


@inject("appModel")
@observer
export class WidgetConfigurator
extends React.Component<WidgetConfiguratorProps, WidgetConfiguratorState>
{    
    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: WidgetConfiguratorProps)
    {
        super(props);
        this.state = {}
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const color = (i: ColorIndex,v: ColorValue) => context.colorTheme.color(i,v);

        const configStyle:any = {
            background: color(context.backGroundColorIndex, context.backGroundColorValue),
            color: color(context.foregroundColorIndex, context.foregroundColorValue)
        }

        if(this.state.hoverBackground) {
            configStyle.background =  color(this.state.hoverBackground.i, this.state.hoverBackground.v)
        }
        if(this.state.hoverForeground) {
            configStyle.color =  color(this.state.hoverForeground.i, this.state.hoverForeground.v)
        }


        return <div className={`${styles.widgetConfig}`} style={configStyle}>
                <div 
                    className={styles.closeButton} 
                    style={{right: "3px", top:"3px"}}
                    onClick={()=> context.state_configuring = false}>
                        <CgCloseR />
                </div>
                <div style={{margin:"10px"}}>
                    <Row>
                        <div style={{width:'80px'}}>Foreground:</div> 
                        <ColorPicker 
                            hoverColor={(i,v) => this.setState({hoverForeground: {i,v}})}
                            cancelHover={() => this.setState({hoverForeground: undefined})}
                            pickColor={(i,v) => {
                                context.foregroundColorIndex = i;
                                context.foregroundColorValue = v;
                            }}
                            context={context} />
                    </Row>
                    <Row>
                        <div style={{width:'80px'}}>Background:</div>
                        <ColorPicker 
                            hoverColor={(i,v) => this.setState({hoverBackground: {i,v}})}
                            cancelHover={() => this.setState({hoverBackground: undefined})}
                            pickColor={(i,v) => {
                                context.backGroundColorIndex = i;
                                context.backGroundColorValue = v;
                            }}
                            context={context} />
                    </Row>
                </div>
                <div>{this.props.customUI}</div>
 
                <div>
                    <Row
                        className={styles.configButton} 
                        onClick={()=>{
                            context.deleteMe();
                            action(()=>context.state_configuring = false)()                           
                        }}>
                        <div ><MdDeleteForever/></div>  
                        <div style={{marginLeft: "3px"}}>Delete</div>                  
                    </Row>
                </div>
                <div className={styles.widgetInfo}>
                    <div>Id: {context.widgetId}</div>
                </div>

            </div>

    };
}
