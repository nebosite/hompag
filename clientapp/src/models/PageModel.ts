import { action, makeObservable, observable } from "mobx";
import { PageItem } from "./AppModel";

// -------------------------------------------------------------------
// Represents a single changeable page 
// -------------------------------------------------------------------
export class PageModel
{
    pageItems: PageItem[] = observable<PageItem>([])
    get columnWidth() {return this.pageWidth / this.columnCount;}
    @observable columnCount = 12;
    @observable rowHeight = 30;
    @observable pageWidth = 1200; 

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        this.pageItems.push({i: 'a', x: 0, y: 0, w: 1, h: 2})
        this.pageItems.push({i: 'b', x: 1, y: 0, w: 3, h: 2})
        this.pageItems.push({i: 'c', x: 4, y: 0, w: 1, h: 2})  

    }

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    addItem(x1: number, y1: number, x2: number, y2: number) {
        if(x2 < x1) [x2,x1] = [x1,x2]
        if(y2 < y1) [y2,y1] = [y1,y2]

        if(x2 < x1) [x2,x1] = [x1,x2]
        if(y2 < y1) [y2,y1] = [y1,y2]

        
        const column1 = Math.floor(x1/this.columnWidth); 
        const row1 = Math.floor(y1/this.rowHeight);
        const column2 = Math.ceil(x2/this.columnWidth); 
        const row2 = Math.ceil(y2/this.rowHeight);
        const columns = Math.max(1, column2-column1);
        const rows = Math.max(1, row2-row1);

        const newItem = new PageItem();
        newItem.i = Date.now().toString();
        newItem.x = column1;
        newItem.y = row1;
        newItem.w = columns;
        newItem.h = rows;
        action(() => this.pageItems.push(newItem) )();
        
    }
}