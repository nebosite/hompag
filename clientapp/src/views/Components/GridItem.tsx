import { inject, observer } from "mobx-react";
import { PageItem } from "models/AppModel";
import React from "react";
import styles from '../AppStyles.module.css';


@inject("appModel")
@observer
export class GridItem 
extends React.Component<{pageItem: PageItem}> 
{    
  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
  render() {
    //const {appModel, pageItem} = this.props;
    return (
        <div className={styles.gridItem}>
            <div className={`${styles.gridItemInterior} ${styles.gridItemFiller}`}>
                <div className={`${styles.gridItemFiller}`} style={{background: "green", margin: "5px"}}>
                    {this.props.children}
                </div>
            </div>
        </div> 
    );
  };
}
