import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import React from "react";
import { registerWidget, WidgetType } from "widgetLibrary";


// TODO: replace _TEMPLATE_ with the widget name

// TODO: Use this class to store data that should be persisted from
// session to session.  ie: permanent changes
export class Widget_TEMPLATE_Data extends WidgetModelData
{ 
    @observable private _myThing: string = "defaultValue"
    get myThing() {return this._myThing}
    set myThing(value:string) { 
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
extends React.Component<{context: WidgetContainer}> 
{    
    transientState: _TEMPLATE_TransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType._TEMPLATE_, c => <Widget_TEMPLATE_ context={c} />, Widget_TEMPLATE_Data.name, () => new Widget_TEMPLATE_Data())
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
    // render
    // -------------------------------------------------------------------
    render() {
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
    };
}

