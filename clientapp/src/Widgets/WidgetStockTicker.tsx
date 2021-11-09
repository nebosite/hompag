import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerProperty, registerType } from "models/hompagTypeHelper";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import styles from './WidgetStockTicker.module.css';
import {BsPlusSquare} from "react-icons/bs"
import { DialogControl } from "Components/DialogControl";
import Row from "Components/Row";
import { AppModel } from "models/AppModel";
import { CSSProperties } from "react";
import { StockData } from "hompag-common";


export function poll(interval_ms: number, runMe: ()=>void) {
    const poller = ()=> {
        runMe();
        setTimeout(poller, interval_ms);
    }
    poller();
}

export class TickerSubscription {
    __t="TickerSubscription"
    @observable name: string = ""

    @observable  private state_history = ""
    get history() {return this.state_history}
    set history(value) {action(()=>{this.state_history = value})()}
    

    constructor() {
        makeObservable(this)
    }
}


// TODO: Use this class to store data that should be persisted from
// session to session.  ie: permanent changes
export class WidgetStockTickerData extends WidgetModelData
{ 
    __t = "WidgetStockTickerData" // Help the serializer know the type when code is minimized

    @observable  private _subscriptions = observable<TickerSubscription>([])
    get subscriptions() {return this._subscriptions}
    set subscriptions(value) { 
        if(value !== this._subscriptions) this.updateMe(()=>{this._subscriptions = value})
    }  
    
    @observable private state_editTicker: TickerSubscription
    get editTicker() {return this.state_editTicker}
    set editTicker(value) { action(()=>{this.state_editTicker = value})() }


    // properties that start with "ref_" or "state_" will not be serialized to the server
    // ref_someThing: ComplexReferenceType
    // state_someOtherThing:  AnotherTypeWeDontWantToSerialize
    ref_appModel:AppModel;

    constructor(appModel: AppModel) {
        super();
        this.ref_appModel = appModel
        makeObservable(this);
        appModel.addMessageListener("StockUpdate", (data: StockData) => {
            //console.log(`Got data: ${JSON.stringify(data)}`)
            const target = this.subscriptions.find(t => t.name.toUpperCase() === data.symbol);
            if(target) {
                target.history = `${data.data[0].values[0]} (${(new Date(data.data[0].date * 1000)).toString()})` 
            }
        })

        console.log("setting timout")
        setTimeout(() => {
            console.log(`inside timeout: ${this.subscriptions.length}`)
            this.subscriptions.forEach(s => this.startServerPing(s.name))
        },1000)
    }

    cancelNewTicker(deleteIfPresent: boolean = false) { 
        if(deleteIfPresent) {
            const deleteMeIndex = this.subscriptions.indexOf(this.editTicker)
            if(deleteMeIndex > -1) {
                this.updateMe(()=>{this.subscriptions.splice(deleteMeIndex,1)})
            }
        }
        this.editTicker = undefined 
    }

    acceptNewTicker() { 
        this.editTicker.name = this.editTicker.name.toUpperCase();
        this.startServerPing(this.editTicker.name)
        if(!this.subscriptions.find(p => p.name === this.editTicker.name))
        {
            this.updateMe(()=>{this.subscriptions.push(this.editTicker)})
        }
        else {
            this.updateMe(()=>{})
        }
        this.editTicker = undefined 
    } 

    startServerPing(symbol: string)
    {
        this.ref_appModel.post(`stock/${symbol}`, {})
    }

}

// TODO: if you have special observable properties on your data class, 
//       such as an observable array, the
//       deserializer needs to be taught about how to deserialize them.
registerProperty(
     "WidgetStockTickerData", // Name of the data class
     "_subscriptions",       // Name of the property
     (type,propertyName,objectFromJson) => {
         return observable(objectFromJson as TickerSubscription[])
     })

// TODO: Use this class to store data that should not be persisted, but should be shared
// with widgets of the same instance on other pages.  
export class StockTickerTransientState
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
export default class WidgetStockTicker 
extends WidgetBase<{context: WidgetContainer}> 
{    
    transientState: StockTickerTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(
            WidgetType.StockTicker, 
            c => <WidgetStockTicker context={c} />, 
            "WidgetStockTickerData", 
            (bag) => new WidgetStockTickerData(bag.get("theApp")))
        registerType("TickerSubscription", () => new TickerSubscription())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer})
    {
        super(props);
        this.transientState = new StockTickerTransientState(props.context.widgetId, props.context.getStateMaker())

        const data = props.context.ref_widget.data as WidgetStockTickerData; 
        data.subscriptions.forEach(s => data.startServerPing(s.name))
    }

    // -------------------------------------------------------------------
    // renderContent - This is for normal widget content
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const data = this.props.context.ref_widget.data as WidgetStockTickerData;  
        const style = {
            background: context.colorTheme.color(context.backGroundColorIndex, context.backGroundColorValue),
            color: context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue),
        }
        const labelStyle:CSSProperties = { width: "80px", textAlign: "right"}


        const renderTicker = (ticker: TickerSubscription) => {
            return <div>{ticker.name}:{ticker.history}</div>
        }

        const addTicker =(ticker: TickerSubscription = undefined) => {
            data.editTicker = ticker ?? new TickerSubscription();
        }
        const newTickerOK = () => data.acceptNewTicker();
        const newTickerCancel = () => data.cancelNewTicker();
        const deleteTicker = () => data.cancelNewTicker(true);
        const editName = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editTicker.name = e.target.value; 


        return (
            <div className={styles.widgetFrame} style={style}>
                { data.editTicker
                    ? <DialogControl style={{width: "400px"}} >
                        <div style={{margin: "10px"}}>Add a new ping target</div>
                        <Row>
                            <div style={labelStyle}>Name:</div>
                            <input  type="text" style={{width: "300px"}} value={ data.editTicker.name} onChange={editName}  /> 
                        </Row>

                        <Row style={{margin: "10px"}}>
                            <button style={{marginRight: "30px"}} onClick={newTickerOK}>OK</button>
                            <button style={{marginRight: "30px"}} onClick={newTickerCancel}>Cancel</button>
                            <button onClick={deleteTicker}>Delete</button>
                        </Row>
                    </DialogControl>
                    : null
                }

                {
                    data.subscriptions.map(s => <div key={s.name}>{renderTicker(s)}</div>)
                }
                <BsPlusSquare onClick={()=>addTicker()} />

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

