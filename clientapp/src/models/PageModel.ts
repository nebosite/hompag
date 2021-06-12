import { ColorTool } from "helpers/ColorTool";
import { action, makeObservable, observable } from "mobx";

export enum WidgetType
{
    Picker = "Picker",
    Editor = "Editor"
}
export class Widget {
    i: string;
    @observable x: number;
    @observable y: number;
    @observable w: number;
    @observable h: number; 
    @observable data: any = {};
    type: WidgetType;

    parentPage: PageModel;
}

// -------------------------------------------------------------------
// Represents a single changeable page 
// -------------------------------------------------------------------
export class PageModel
{
    widgets: Widget[] = observable<Widget>([])
    get columnCount() {return Math.floor(this.pageWidth / this.columnWidth);}
    @observable columnWidth = 50;
    @observable rowHeight = 50;
    @observable pageWidth = 1200; 
    @observable colorTheme: ColorTool;  

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor()
    {
        makeObservable(this);

        

        // this.pageItems.push({i: 'a', x: 0, y: 0, w: 8, h: 10,    parentPage: this, data: {}, type: "Editor"})
        // this.pageItems.push({i: 'b', x: 10, y: 0, w: 4, h: 4,    parentPage: this, data: {}, type: "Colors"})
        // this.pageItems.push({i: 'c', x: 6, y: 12, w: 5, h: 3,    parentPage: this, data: {}, type: "Blank"})  

        this.colorTheme = new ColorTool(["#FFA100","#FFCF00","#FF0051","#007DFF","#0004FF"]  )
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

        const newItem = new Widget();
        newItem.i = Date.now().toString();
        newItem.x = column1;
        newItem.y = row1;
        newItem.w = columns;
        newItem.h = rows;
        newItem.type = WidgetType.Picker
        newItem.parentPage = this;
        action(() => this.widgets.push(newItem) )();
        
    }
}