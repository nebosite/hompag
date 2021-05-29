// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import ReactGridLayout from 'react-grid-layout';
import { PageModel } from "models/PageModel";
import styles from '../AppStyles.module.css';
import '../../../node_modules/react-grid-layout/css/styles.css'
import '../../../node_modules/react-resizable/css/styles.css'
import { GridItem } from "./GridItem";
import { ColorIndex, ColorValue } from "helpers/ColorTool";

interface FungiblePageProps
{
    pageModel?: PageModel
}
@inject("appModel")
@observer
export class FungiblePage 
extends React.Component<FungiblePageProps> 
{    
    state = { draggingOK: true, dragging: false, x1:0, y1: 0, x2: 0, y2:0}

    // -------------------------------------------------------------------
    // render
    // Docs on grid layout:  https://www.npmjs.com/package/react-grid-layout
    // -------------------------------------------------------------------
    render() {
        const {pageModel} = this.props; 
        let {draggingOK, dragging, x1, y1, x2, y2} = this.state;
        const thresholdDistance = pageModel.columnWidth / 4;
        
        const mouseCoords = (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            const gridElement = document.getElementById("theGrid") as HTMLCanvasElement; 
            var rect = gridElement.getBoundingClientRect();
            return {x:e.clientX - rect.left, y: e.clientY - rect.top}
        }

        const mouseDown =  (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if(!draggingOK) {
                console.log(`Not Allowed! ${this.state.dragging}`)
                this.setState({dragging:false})
                return;
            }
            const pos = mouseCoords(e);
            for(const item of pageModel.pageItems)
            {
                const ix = item.x * pageModel.columnWidth;
                const iy = item.y * pageModel.rowHeight;
                const iw = item.w * pageModel.columnWidth;
                const ih = item.h * pageModel.rowHeight;

                if(    pos.x >= ix 
                    && pos.x <= (ix + iw)
                    && pos.y >= iy
                    && pos.y <= iy + ih) 
                {
                    console.log(`Inside! ${this.state.dragging}`)
                    this.setState({dragging:false})
                    return;
                }
            }
            console.log("Let's Drag...")
            this.setState({ dragging: true, x1:pos.x, y1: pos.y, x2:pos.x, y2: pos.y})
            e.stopPropagation();
        }

        const mouseMove =  (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if(!draggingOK) {
                this.setState({dragging:false})
                return;
            }
            if(!dragging) return;
            const pos = mouseCoords(e);
            this.setState({ x2:pos.x, y2: pos.y})
            e.stopPropagation();
        }

        const mouseUp =  (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            console.log(`UP: ${this.state.dragging}`)
            if(!dragging) return;
            const pos = mouseCoords(e);
            this.setState({ dragging: false})
            const totalDistance = Math.abs(pos.x - this.state.x1) + Math.abs(pos.y - this.state.y1);
            if(totalDistance > thresholdDistance)
            {
                this.props.pageModel.addItem(this.state.x1, this.state.y1, pos.x, pos.y)
            }
            e.stopPropagation();
        }

        const dragStyle: any = {};
        if(dragging)
        {
            const gridElement = document.getElementById("theGrid") as HTMLCanvasElement; 
            var rect = gridElement.getBoundingClientRect();

            if(x2 < x1) [x2,x1] = [x1,x2]
            if(y2 < y1) [y2,y1] = [y1,y2]

            
            const column1 = Math.floor(x1/pageModel.columnWidth); 
            const row1 = Math.floor(y1/pageModel.rowHeight);
            const column2 = Math.ceil(x2/pageModel.columnWidth); 
            const row2 = Math.ceil(y2/pageModel.rowHeight);
            const columns = Math.max(1, column2-column1);
            const rows = Math.max(1, row2-row1);
            
            const totalDistance = x2 - x1 + y2 - y1;

            dragStyle.opacity = (totalDistance > thresholdDistance )?  .4 : 0;
            dragStyle.width = `${columns * pageModel.columnWidth}px`;
            dragStyle.height =  `${rows * pageModel.rowHeight}px`;
            dragStyle.left = `${column1 * pageModel.columnWidth + rect.left}px`;
            dragStyle.top = `${row1 * pageModel.rowHeight + rect.top}px`;           
        }
        else
        {
            dragStyle.opacity = 0;
        }

        return (
            <div id="theGrid" 
                className={styles.FungiblePage} 
                onMouseDown={mouseDown}
                onMouseMove={mouseMove}
                onMouseUp={mouseUp}
                style={{
                    width: `${pageModel.pageWidth}px`, 
                    height:"5000px", 
                    background: pageModel.colorTheme.color(ColorIndex.Background, ColorValue.V5_Lightened)}}
            >
                <div 
                    id="dragArea" 
                    style={dragStyle}
                    className={styles.dragArea} />

                <ReactGridLayout 
                    className="layout" 
                    onDragStart={() => this.setState({draggingOK:false})}
                    onResizeStart={() => this.setState({draggingOK:false})}
                    onDragStop={() => this.setState({draggingOK:true})}
                    onResizeStop={() => this.setState({draggingOK:true})}
                    useCSSTransforms={false}
                    cols={pageModel.columnCount} rowHeight={pageModel.rowHeight} width={pageModel.pageWidth}
                    compactType={null}
                    containerPadding={[0,0]}
                    margin={[0,0]}
                    draggableHandle={".gridItemDragHandleTag"}
                >
                    {pageModel.pageItems.map(pi => (
                        <div key={pi.i} data-grid={pi}>
                            <GridItem pageItem={pi}>
                                Lorem Ipsum <a href="http://google.com">Link here</a> wow.<br/>
                                twas brilling and the slithy toves<br/>
                                Did gyre and gimble in the wabe<br/>
                                all mimsy were the borogroves<br/>
                                and the momewraths outgrabe
                            </GridItem>
                        </div>))}  

                </ReactGridLayout> 

            </div>
        );
    };
}
