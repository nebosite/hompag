import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";


// TODO: replace _TEMPLATE_ with the widget name

// TODO: in widgetLibrary:
//      1. Add the widget name to the WidgetType Enumb
//      2. Call your widet's static register function in registerWidgets()
//      3. At this point, you should be able to add this new widget to your page
//      4. Check in your code then do the rest of the TODOs

// TODO: Use this class to store data that should be persisted from
// session to session.  ie: permanent changes
export class Widget_TEMPLATE_Data extends WidgetModelData
{ 
    __t = "Widget_TEMPLATE_Data" // Help the serializer know the type when code is minimized
    @observable private _myThing: string = "defaultValue"
    get myThing() {return this._myThing}
    set myThing(value) { 
        if(value !== this._myThing) this.updateMe(()=>{this._myThing = value})
    }

    // properties that start with "ref_" or "state_" will not be serialized to the server
    // ref_someThing: ComplexReferenceType
    // state_someOtherThing:  AnotherTypeWeDontWantToSerialize

    constructor() {
        super();
        makeObservable(this);
    }
}

// TODO: if you have special observable properties on your data class, 
//       such as an observable array, the
//       deserializer needs to be taught about how to deserialize them.
// registerProperty(
//      "Widget_TEMPLATE_Data", // Name of the data class
//      "someCollection",       // Name of the property
//      (type,propertyName,objectFromJson) => {
//          return observable(objectFromJson as MyCollectionType[])
//      })

// TODO: Use this class to store data that should not be persisted, but should be shared
// with widgets of the same instance on other pages.  
export class _TEMPLATE_TransientState
{
    myState:    ObservableState<string>;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        this.myState = new ObservableState<string>("myState", stateMaker)
        this.myState.value = "defaultValue"
    } 
}


// --------------------------------------------------------------------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------------------------------------------------------------------
@observer
export default class Widget_TEMPLATE_ 
extends WidgetBase<{context: WidgetContainer}> 
{    
    transientState: _TEMPLATE_TransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType._TEMPLATE_, c => <Widget_TEMPLATE_ context={c} />, "Widget_TEMPLATE_Data", () => new Widget_TEMPLATE_Data())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer})
    {
        super(props);
        this.transientState = new _TEMPLATE_TransientState(props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // renderContent - This is for normal widget content
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const data = this.props.context.ref_widget.data as Widget_TEMPLATE_Data; 
        const style = {
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }
        return (
            <div style={style}>
                TODO: Put your content here. ({data.myThing}, {this.transientState.myState.value})
            </div> 
        );
    }

    // -------------------------------------------------------------------
    // renderConfigUI - this is for special configuration
    // -------------------------------------------------------------------
    renderConfigUI() {
        return <div>TODO: Put custom configuration UI here</div>
    }
}

