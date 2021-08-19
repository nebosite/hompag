import { registerProperty, registerType } from "./hompagTypeHelper";
import { ColorTool } from "helpers/ColorTool";
import { action, makeObservable, observable, reaction } from "mobx";
import { AppModel } from "./AppModel";
import { WidgetContainer } from "./WidgetContainer";
import { WidgetType } from "./WidgetModel";
import { generateStringId } from "helpers/randomHelper";


registerType("PageModel", bag => new PageModel(bag.get("theApp")))
registerProperty("PageModel", "widgetContainers", (t,n,o) => {
    return observable(o as WidgetContainer[])
})

// https://color.adobe.com/explore
export const colorThemes = [
    {name: "Seattle Laserbeam", colors: ["#ADFF0D","#0CE811","#00FF94","#00CBEB","#0058FF"]},
    {name: "Piñata Heartbreak", colors: ["#FFC119","#DA0DFF","#4E00FF","#97FF19","#0D46FF"]},
    {name: "Miami Hot Dog", colors: ["#0DFF33","#193CFF","#CFFF01","#FF0038","#FFC50D"]},
    {name: "Lagoon Puppy", colors: ["#0C41F8","#0B6FD9","#00B4F0","#0BD9D6","#0CF8B2"]},
    {name: "Prairie Chicken", colors: [ "#0DFC63","#FAC700","#1ED90B","#97F001","#D9CF0B"]},
    {name: "Moab 7-11", colors: ["#FCD50D","#D99D0B","#F08C00","#D95D0B","#FA3800"]},
    {name: "Lincoln on Mars", colors: ["#FCA90D","#D9720B","#F04D01","#D9260B","#FA002B"]},
    {name: "Emperor Foobar", colors: ["#F80DFF","#8F0BDE","#4700F5","#0B17DE","#0063FF"]},
    {name: "Kindergarten Recess", colors: ["#11FF00","#00A5E0","#8300F5","#DE2B0B","#FFC200"]},
    {name: "Rascal Opportunist", colors: ["#F50C90","#F5AC18","#6500F5","#22F518","#005FF5"]},
    {name: "Regolith Camping", colors: ["#ffffff","#E5DFC1","#E0DFD5","#665500","#C2C0B8"]},
    {name: "Portales on my Mind", colors: ["#FFA100","#FFCF00","#FF0051","#007DFF","#0004FF"]},
    {name: "Sepia Virus", colors: ["#063647","#458985","#DFDFC9","#DBA67B","#A55C55"]},
    {name: "Poster Adult", colors: ["#2A2359","#04C4D9","#D8F2F0","#F2CB07","#F26716"]},
    {name: "Complements on the Chorf", colors: ["#5433CC","#FFEA29","#FFFDED","#3C258F","#FFF48C",]},
]

// -------------------------------------------------------------------
// Represents a single changeable page 
// -------------------------------------------------------------------
export class PageModel
{
    name: string;
    version: number = -999;
    @observable widgetContainers: WidgetContainer[] = observable<WidgetContainer>([])
    @observable columnCount = 24;
    @observable columnWidth = 50;
    @observable rowHeight = 50;
    get pageWidth() {return this.columnCount * this.columnWidth}; 
    @observable colorTheme: ColorTool;  

    get widgetIds() {return this.widgetContainers.map(c => c.widgetId)}

    private ref_App: AppModel; 

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(app: AppModel)
    {
        makeObservable(this);
        this.ref_App = app;
        this.colorTheme = new ColorTool(colorThemes[0] )

        reaction( 
            () => [this.colorTheme, this.rowHeight, this.pageWidth, this.columnWidth],
            () => this.save()
        )
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

        const widgetId = generateStringId(); 
        const newWidget = this.ref_App.getWidget(widgetId);
        newWidget.widgetType = WidgetType.Picker;

        const newItem = new WidgetContainer();
        action(() => {
            newItem.widgetId = widgetId;
            newItem.x = column1;
            newItem.y = row1;
            newItem.w = columns;
            newItem.h = rows;
            this.widgetContainers.push(newItem)
            newItem.parentPage = this;
            console.log(`New container2: ${newItem.widgetId} : ${newItem.ref_widget.widgetType}`)
        })();
        
    }

    // -------------------------------------------------------------------
    // setSomethingOnContainer 
    // -------------------------------------------------------------------
    setSomethingOnContainer(id: string, setter: (widget: WidgetContainer)=> void)
    {
        const container = this.widgetContainers.find(wc => wc.getKey() === id)
        //console.log(`Setting something on ${container?.ref_widget.id}`)
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
    getWidget(id: string)
    {
        if(this.widgetContainers.find(c => c.widgetId === id))
        {
            return this.ref_App.getWidget(id)  
        }
        return null;
    }

    // -------------------------------------------------------------------
    // getStateMaker 
    // -------------------------------------------------------------------
    getStateMaker(widgetId: string) {
        return <T>(name: string, handler: (data: T)=>void)=> 
        {
            return this.ref_App.createTransientStateHandler<T>(widgetId, name, handler);
        }
    }
}