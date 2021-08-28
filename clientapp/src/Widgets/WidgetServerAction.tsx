import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import React from "react";
import { registerWidget, WidgetType } from "widgetLibrary";
import { BsPlusSquare } from "react-icons/bs"
import Combobox from "Components/ComboBox";


export class WidgetServerActionData extends WidgetModelData
{ 
    @observable private _pickedActions: string[] = observable([])
    get pickedActions() {return this._pickedActions}
    set pickedActions(value:string[]) { 
        if(value !== this._pickedActions) this.updateMe(()=>{this._pickedActions = value})
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor() {
        super();
        makeObservable(this);
    }

    // -------------------------------------------------------------------
    // addAction
    // -------------------------------------------------------------------
    addAction(item: string) {
        this.updateMe(()=> this.pickedActions.push(item))
    }
}

export class ServerActionTransientState
{
    myState:    ObservableState<string>;


    @observable private _pickingAction = false;
    get pickingAction() {return this._pickingAction}
    set pickingAction(value: boolean) { action(()=>this._pickingAction = value)()}

    @observable pickableItems: string[] = ["foo", "bar"]

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        makeObservable(this);
        this.myState = new ObservableState<string>("myState", stateMaker)
        this.myState.value = "defaultValue"
    } 
}


// --------------------------------------------------------------------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------------------------------------------------------------------
@observer
export default class WidgetServerAction 
extends React.Component<{context: WidgetContainer}> 
{    
    transientState: ServerActionTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType.ServerAction, c => <WidgetServerAction context={c} />, WidgetServerActionData.name, () => new WidgetServerActionData())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer})
    {
        super(props);
        this.transientState = new ServerActionTransientState(props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const tState = this.transientState;
        const data = this.props.context.ref_widget.data as WidgetServerActionData; 
        const style = {
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }

        const selectItem = (item: string) => {
            console.log(`Selected ${item}`)
            data.addAction(item);
            tState.pickingAction = false;
        }

        const pickableItems = tState.pickableItems
            .filter(i => data.pickedActions.indexOf(i) === -1)
            .map(i => ({value: i, label: i}))

        return (
            <div style={style}>
                <div>
                    {
                        data.pickedActions.map(a => <div>{a}</div>)
                    }                    
                </div>

                {
                    pickableItems.length 
                        ? tState.pickingAction
                            ?  <div>Actions available: 
                                    <Combobox
                                        itemsSource={pickableItems}
                                        onSelectValue={selected => selectItem(selected)}
                                        width="90%"
                                        menuWidth="100%"
                                        styleOverride={{fontSize: "12px"}}
                                    />  
                                </div>      
                            : <button onClick={()=>tState.pickingAction = true}><BsPlusSquare /></button>
                        : null
                }
                 
            </div> 
        );
    };
}

