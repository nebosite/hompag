import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import React from "react";
import styles from '../AppStyles.module.css';

@inject("appModel")
@observer
export class WidgetFrame 
extends React.Component<{context: WidgetContainer}> 
{    
    state = {configVisible: false}
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context: widget} = this.props;
        const color = (i: ColorIndex,v: ColorValue) => widget.colorTheme.color(i,v);


        const configClick = () => {
            this.setState({configVisible: true})
        }

        const renderConfig = () =>
        {
            return <div className={`${styles.ConfigSection} ${styles.Filler}`}>
                <button onClick={()=>{
                    widget.deleteMe();
                    this.setState({configVisible:false});
                }}>Delete Me</button>

                <button onClick={()=>{
                    this.setState({configVisible:false})
                }}>Done</button>
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
                        style={{
                            background: color(widget.backGroundColorIndex, widget.backGroundColorValue),
                            color: color(widget.foregroundColorIndex, widget.foregroundColorValue)}}
                        >
                        <div className={`${styles.DragHandle} widgetFrameDragHandleTag`} />
                        {this.state.configVisible ? renderConfig() : renderContent() }
                    </div>
                </div>
            </div> 
        );
    };
}
