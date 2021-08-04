import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import styles from '../AppStyles.module.css';
import Row from "./Row";
import {MdDeleteForever} from 'react-icons/md'
import {CgCloseR} from 'react-icons/cg'


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


        const configClick = () => {
            this.setState({configVisible: true})
        }

        const renderConfig = () =>
        {
            return <div className={`${styles.ConfigSection} ${styles.Filler}`} style={configStyle}>
                <div 
                    className={styles.closeButton} 
                    style={{right: "3px", top:"3px"}}
                    onClick={()=> this.setState({configVisible: false})}>
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
 
                <div>
                    <Row
                        className={styles.configButton} 
                        onClick={()=>{
                            context.deleteMe();
                            this.setState({configVisible:false});
                        }}>
                        <div ><MdDeleteForever/></div>  
                        <div style={{marginLeft: "3px"}}>Delete</div>                  
                    </Row>
                </div>

            </div>
        }

        const renderContent = () =>
        {
           return <div>
                    <div className={`${styles.ConfigButton}`} onClick={configClick}>...</div>
                    <div className={`${styles.ChildBorder}`}>
                        {this.props.children}
                    </div>
                </div> 
        }

        return (
            <div className={styles.widgetFrame}>
                <div className={`${styles.Interior} ${styles.Filler}`}>
                    <div className={`${styles.Filler}`} 
                        style={widgetStyle}
                        >
                        <div className={`${styles.DragHandle} widgetFrameDragHandleTag`} />
                        {this.state.configVisible ? renderConfig() : renderContent() }
                    </div>
                </div>
            </div> 
        );
    };
}
