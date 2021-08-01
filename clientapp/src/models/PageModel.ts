import { registerProperty, registerType } from "./hompagTypeHelper";
import { ColorTool } from "helpers/ColorTool";
import { action, makeObservable, observable } from "mobx";
import { AppModel } from "./AppModel";
import { WidgetContainer } from "./WidgetContainer";


registerType("PageModel", bag => new PageModel(bag.get("theApp")))
registerProperty("PageModel", "widgetContainers", (t,n,o) => {
    return observable(o as WidgetContainer[])
})

// https://color.adobe.com/explore
export const colorThemes = [
    {name: "Desert", colors: ["#FFA100","#FFCF00","#FF0051","#007DFF","#0004FF"]},
    {name: "Sepia Vintage", colors: ["#063647","#458985","#DFDFC9","#DBA67B","#A55C55"]},
    {name: "Poster", colors: ["#2A2359","#04C4D9","#D8F2F0","#F2CB07","#F26716"]},
    {name: "Complementarios", colors: ["#5433CC","#FFEA29","#FFFDED","#3C258F","#FFF48C",]},
]

// -------------------------------------------------------------------
// Represents a single changeable page 
// -------------------------------------------------------------------
export class PageModel
{
    name: string;
    @observable widgetContainers: WidgetContainer[] = observable<WidgetContainer>([])
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
        this.colorTheme = new ColorTool(colorThemes[0] )
        console.log(`Constructed page with colortheme: ${this.colorTheme}`)
    }

    // -------------------------------------------------------------------
    // save - save this page to the server 
    // -------------------------------------------------------------------
    save()
    {
        this.ref_App.savePage(this);
    }

    // -------------------------------------------------------------------
    // removeWidget - Remove this widget from the page
    // -------------------------------------------------------------------
    removeWidget(container: WidgetContainer)
    {
        const index = this.widgetContainers.findIndex(w => w.x === container.x && w.y === container.y)
        if(index > -1) this.widgetContainers.splice(index, 1);
        this.save();
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

        const newItem = new WidgetContainer(this);
        action(() => {
            newItem.x = column1;
            newItem.y = row1;
            newItem.w = columns;
            newItem.h = rows;
            this.widgetContainers.push(newItem) 
        })();
        
    }

    // -------------------------------------------------------------------
    // setSomethingOnContainer 
    // -------------------------------------------------------------------
    setSomethingOnContainer(id: string, setter: (widget: WidgetContainer)=> void)
    {
        const container = this.widgetContainers.find(wc => wc.getKey() === id)
        console.log(`Setting something on ${container?.ref_widget.id}`)
        if(container)
        {
            action(() => setter(container))()
        }
        else {
            console.log(`ERROR: Can't find widget with ID: ${id}`)
        }

    }

    // -------------------------------------------------------------------
    // setWidgetSize 
    // -------------------------------------------------------------------
    setWidgetSize(id: string, w: number, h:number)
    {
        this.setSomethingOnContainer(id, (widget: WidgetContainer) => {
            widget.w = w;
            widget.h = h;
        })
    }

    // -------------------------------------------------------------------
    // setContainerLocation 
    // -------------------------------------------------------------------
    setContainerLocation(id: string, x: number, y:number)
    {
        this.setSomethingOnContainer(id, (widget: WidgetContainer) => {
            widget.x = x;
            widget.y = y;
        })
    }

    // -------------------------------------------------------------------
    // getWidget 
    // -------------------------------------------------------------------
    getWidget(id: string, loadIfNotFound: boolean = true)
    {
        return this.ref_App.getWidget(id, loadIfNotFound)
    }
}