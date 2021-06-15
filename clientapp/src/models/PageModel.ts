import { ColorTool } from "helpers/ColorTool";
import { action, makeObservable, observable } from "mobx";
import { AppModel } from "./AppModel";
import { WidgetModel, WidgetType } from "./WidgetModel";



// -------------------------------------------------------------------
// Represents a single changeable page 
// -------------------------------------------------------------------
export class PageModel
{
    name: string;
    widgets: WidgetModel[] = observable<WidgetModel>([])
    get columnCount() {return Math.floor(this.pageWidth / this.columnWidth);}
    @observable columnWidth = 50;
    @observable rowHeight = 50;
    @observable pageWidth = 1200; 
    @observable colorTheme: ColorTool;  

    private ref_App: AppModel; 

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(app: AppModel)
    {
        makeObservable(this);
        this.ref_App = app;

        // this.pageItems.push({i: 'a', x: 0, y: 0, w: 8, h: 10,    parentPage: this, data: {}, type: "Editor"})
        // this.pageItems.push({i: 'b', x: 10, y: 0, w: 4, h: 4,    parentPage: this, data: {}, type: "Colors"})
        // this.pageItems.push({i: 'c', x: 6, y: 12, w: 5, h: 3,    parentPage: this, data: {}, type: "Blank"})  

        this.colorTheme = new ColorTool(["#FFA100","#FFCF00","#FF0051","#007DFF","#0004FF"]  )
    }

    // -------------------------------------------------------------------
    // addItem 
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

        const newItem = new WidgetModel(this.ref_App);
        action(() => {
            newItem.x = column1;
            newItem.y = row1;
            newItem.w = columns;
            newItem.h = rows;
            newItem.myType = WidgetType.Picker
            this.widgets.push(newItem) 
        })();
        
    }

    // -------------------------------------------------------------------
    // setWidgetSize 
    // -------------------------------------------------------------------
    setSomethingOnWidget(id: string, setter: (widget: WidgetModel)=> void)
    {
        const widget = this.widgets.find(w => w.i === id)
        if(widget)
        {
            action(() => setter(widget))()
        }
        else {
            console.log(`ERROR: Can't find widget with ID: ${id}`)
        }

    }

    // -------------------------------------------------------------------
    // deleteWidget 
    // -------------------------------------------------------------------
    deleteWidget(id: string)
    {
        const widgetIndex = this.widgets.findIndex(w => w.i === id);
        if(widgetIndex === -1)
        {
            console.log(`ERROR: Could not find widget with index: ${id}`)
        }
        this.widgets.splice(widgetIndex,1);
    }

    // -------------------------------------------------------------------
    // setWidgetSize 
    // -------------------------------------------------------------------
    setWidgetSize(id: string, w: number, h:number)
    {
        this.setSomethingOnWidget(id, (widget: WidgetModel) => {
            widget.w = w;
            widget.h = h;
        })
    }

    // -------------------------------------------------------------------
    // setWidgetLocation 
    // -------------------------------------------------------------------
    setWidgetLocation(id: string, x: number, y:number)
    {
        this.setSomethingOnWidget(id, (widget: WidgetModel) => {
            widget.x = x;
            widget.y = y;
        })
    }
}