import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { inject, observer } from "mobx-react";
import { Widget } from "models/PageModel";
import React from "react";
import styles from '../AppStyles.module.css';

@inject("appModel")
@observer
export class GridItem 
extends React.Component<{pageItem: Widget}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const color = this.props.pageItem.parentPage.colorTheme.color;
        return (
            <div className={styles.gridItem}>
                <div className={`${styles.gridItemInterior} ${styles.gridItemFiller}`}>
                    <div className={`${styles.gridItemFiller}`} 
                        style={{
                            background: color(ColorIndex.Background, ColorValue.V7_ExtraBright),
                            color: color(ColorIndex.Foreground, ColorValue.V2_Dark)}}
                    >
                        <div className={`${styles.gridItemDragHandle} gridItemDragHandleTag`}>🔳</div>
                        <div className={`${styles.gridItemChildBorder}`}>
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </div> 
        );
    };
}
