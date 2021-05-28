import { makeObservable, observable } from "mobx";
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
    addItem(rawX: number, rawY: number, rawW: number, rawH: number) {
        console.log(`Adding: ${rawX},${rawY}`)
        const column = Math.floor(rawX/this.columnWidth); 
        const row = Math.floor(rawY/this.rowHeight);

        const newItem = new PageItem();
        newItem.i = Date.now().toString();
        newItem.x = column;
        newItem.y = row;
        newItem.w = Math.floor(rawW/this.columnWidth) + 1;
        newItem.h = Math.floor(rawH/ this.rowHeight) + 1;
        this.pageItems.push(newItem) 
    }
}