// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import styles from './AppStyles.module.css';
import { AppModel, PageItem } from "models/AppModel";
import '../../node_modules/react-grid-layout/css/styles.css'
import '../../node_modules/react-resizable/css/styles.css'
import ReactGridLayout from 'react-grid-layout';


@inject("appModel")
@observer
export class GridItem 
extends React.Component<{appModel?: AppModel, pageItem: PageItem}> 
{    
  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
  render() {
    const {appModel, pageItem} = this.props;
    const handleClick = (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
    }

    return (
        <div className={styles.gridItem} 
            style={{width: `${pageItem.w * appModel.columnWidth}px`,height: `${pageItem.h * appModel.rowHeight}px`}}
            onClick={handleClick}>
            <div className={styles.gridItemInterior}>
                {this.props.children}
            </div>
        </div>
    );
  };
}

@inject("appModel")
@observer
export class MainAppPage 
extends React.Component<{appModel?: AppModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // Docs on grid layout:  https://www.npmjs.com/package/react-grid-layout
  // -------------------------------------------------------------------
  render() {
    const {appModel} = this.props;
    
    const handleClick = (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const gridElement = document.getElementById("theGrid") as HTMLCanvasElement; 
        var rect = gridElement.getBoundingClientRect();
        appModel.addItem(e.clientX - rect.left, e.clientY - rect.top)
        e.stopPropagation();
    }

    return (
        <div id="theGrid" 
            className={styles.MainAppPage} 
            onClick={handleClick}
            style={{width: `${appModel.pageWidth}px`, height:"5000px"}}
        >
            <ReactGridLayout 
                className="layout" 
                cols={appModel.columnCount} rowHeight={appModel.rowHeight} width={appModel.pageWidth}
                containerPadding={[0,0]}
                margin={[0,0]}
            >
                {appModel.pageItems.map(pi => <div key={pi.i} data-grid={pi}><GridItem pageItem={pi}>{pi.i}</GridItem></div>)}  

            </ReactGridLayout> 

        </div>
    );
  };
}
