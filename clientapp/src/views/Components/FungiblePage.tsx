// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import ReactGridLayout from 'react-grid-layout';
import { PageModel } from "models/PageModel";
import styles from '../AppStyles.module.css';
import '../../../node_modules/react-grid-layout/css/styles.css'
import '../../../node_modules/react-resizable/css/styles.css'
import { GridItem } from "./GridItem";

@inject("appModel")
@observer
export class FungiblePage 
extends React.Component<{pageModel?: PageModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // Docs on grid layout:  https://www.npmjs.com/package/react-grid-layout
  // -------------------------------------------------------------------
  render() {
    const {pageModel} = this.props;
    
    const handleClick = (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        //const gridElement = document.getElementById("theGrid") as HTMLCanvasElement; 
        //var rect = gridElement.getBoundingClientRect();
        //appModel.addItem(e.clientX - rect.left, e.clientY - rect.top)
        e.stopPropagation();
    }

    return (
        <div id="theGrid" 
            className={styles.MainAppPage} 
            onClick={handleClick}
            style={{width: `${pageModel.pageWidth}px`, height:"5000px"}}
        >
            <div id="dragArea" className={styles.dragArea}></div>
            <ReactGridLayout 
                className="layout" 
                useCSSTransforms={false}
                cols={pageModel.columnCount} rowHeight={pageModel.rowHeight} width={pageModel.pageWidth}
                compactType="horizontal"
                containerPadding={[0,0]}
                margin={[0,0]}
            >
                {pageModel.pageItems.map(pi => <div key={pi.i} data-grid={pi}><GridItem pageItem={pi}>{pi.i}</GridItem></div>)}  

            </ReactGridLayout> 

        </div>
    );
  };
}
