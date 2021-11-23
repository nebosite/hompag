import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerProperty, registerType } from "models/hompagTypeHelper";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import styles from './WidgetStockTicker.module.css';
import { DialogControl } from "Components/DialogControl";
import Row from "Components/Row";
import { AppModel } from "models/AppModel";
import { CSSProperties } from "react";
import { StockData, StockDetail } from "hompag-common";
import React from "react";
import SafeLink from "Components/SafeLink";

// ICONS
import { TiDelete } from "react-icons/ti";
import {BsPlusSquare} from "react-icons/bs"
import {ImArrowUp, ImArrowDown} from "react-icons/im"


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

    @observable  private state_history:StockDetail[]
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

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(appModel: AppModel) {
        super();
        this.ref_appModel = appModel
        makeObservable(this);
        appModel.addMessageListener("StockUpdate", (data: StockData) => {
            //console.log(`Got data: ${JSON.stringify(data)}`)
            const target = this.subscriptions.find(t => t.name.toUpperCase() === data.symbol);
            if(target) {
                target.history = data.data
            }
        })

        console.log("setting timout")
        setTimeout(() => {
            console.log(`inside timeout: ${this.subscriptions.length}`)
            this.subscriptions.forEach(s => this.startServerPing(s.name))
        },1000)
    }

    // -------------------------------------------------------------------
    //  
    // -------------------------------------------------------------------
    removeSubscription(subscription: TickerSubscription) {  
        this.updateMe(()=>{this.subscriptions.remove(subscription)});
        
    }

    // -------------------------------------------------------------------
    //  
    // -------------------------------------------------------------------
    cancelNewTicker(deleteIfPresent: boolean = false) { 
        if(deleteIfPresent) {
            const deleteMeIndex = this.subscriptions.indexOf(this.editTicker)
            if(deleteMeIndex > -1) {
                this.updateMe(()=>{this.subscriptions.splice(deleteMeIndex,1)})
            }
        }
        this.editTicker = undefined 
    }

    // -------------------------------------------------------------------
    //  
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    //  
    // -------------------------------------------------------------------
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
    //  
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        this.myState = new ObservableState<string>("myState", stateMaker)
        this.myState.value = "defaultValue"
    } 
}

let stockComponentID = 0;

interface StockComponentProps {
    context: TickerSubscription
    onDelete: ()=>void
}

class StockComponentState {
    @observable  private _graphWidth = 100
    get graphWidth() {return this._graphWidth}
    set graphWidth(value) {action(()=>{this._graphWidth = value})()}
    
    @observable  private _graphHeight = 30
    get graphHeight() {return this._graphHeight}
    set graphHeight(value) {action(()=>{this._graphHeight = value})()}
    
    constructor() { makeObservable(this)}
}

const ONE_HOUR = 3600 * 1000
const ONE_DAY = ONE_HOUR * 24

@observer
export class StockComponent 
extends React.Component<StockComponentProps> 
{    
    id:string;
    st = new StockComponentState()

    constructor(props: StockComponentProps) {
        super(props);

        this.id = `stockticker_${stockComponentID++}_${props.context.name}`;
    }

    // -------------------------------------------------------------------
    // componentDidUpdate
    // -------------------------------------------------------------------
    componentDidUpdate(): void {
        const canvas = document.getElementById(this.id) as HTMLElement;
        this.st.graphWidth = canvas.clientWidth 
        this.st.graphHeight = canvas.clientHeight
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context}= this.props;

        const endDate = Date.now() - 90 * ONE_DAY

        let majorMarkers:number[] = []
        let tickMarkers:number[] = []
        let tickUnit = 0

        let points = ""
        let price = "na"
        let currentPrice = 0;
        let lowestValue = 0;
        let highestValue = 0;
        let ticks:any;
        let markers: any;
        let volumeShade: any;
        let previousClosingPrice = 0;

        if(context.history){
            let currentTickTimeValue = new Date().getHours();
            let currentMarkTimeValue = new Date().getDay();
            let startDay = new Date().getDay();
            lowestValue = highestValue = context.history[0].values[0];
    
            currentPrice = context.history[0].values[0]
            let x = 0;

            const tempPoints:{x:number, y: number}[] = []
            for(let i = 0; i < context.history.length; i++)
            {
                const pointTime = context.history[i].date * 1000
                const pointDate = new Date(pointTime);
                if(previousClosingPrice === 0 && pointDate.getDay() !== startDay)
                {
                    previousClosingPrice = context.history[i].values[0]    
                }
                if(pointTime < endDate) break;

                const age = Date.now() - pointTime;
                if(i === 0 && age/ ONE_HOUR > 10) tickUnit = 1 // days
                const calcTimeValue = (type: number) => {
                    switch(type)
                    {
                        case 0: return pointDate.getHours(); 
                        case 1: return pointDate.getDay(); 
                        case 2: return pointDate.getMonth(); 
                        case 3: return pointDate.getFullYear(); 
                        case 4: return Math.floor(pointDate.getFullYear()/10); 
                        case 5: return Math.floor(pointDate.getFullYear()/100); 
                        case 6: return Math.floor(pointDate.getFullYear()/1000); 
                    }
                }
                let tickTimeValue = calcTimeValue(tickUnit);
                let markTimeValue = calcTimeValue(tickUnit + 1);

                if(markTimeValue !== currentMarkTimeValue) {
                    majorMarkers.push(x);
                    tickUnit++;
                    tickTimeValue = calcTimeValue(tickUnit);
                    markTimeValue = calcTimeValue(tickUnit + 1);
                }
                else if(tickTimeValue !== currentTickTimeValue) {
                    tickMarkers.push(x);
                }

                currentTickTimeValue = tickTimeValue;
                currentMarkTimeValue = markTimeValue;

                const y = context.history[i].values[0]
                lowestValue = Math.min(lowestValue, y);
                highestValue = Math.max(highestValue,y);
                tempPoints.push({x,y})
                x++;
            }   
            
            const height = highestValue - lowestValue;
            const expandFactor = this.st.graphWidth/x;
            tempPoints.forEach(p =>  points += `${this.st.graphWidth - p.x * expandFactor},${(this.st.graphHeight - (p.y - lowestValue)/height * this.st.graphHeight)} `)
            ticks = tickMarkers.map(mx => {
                const x = this.st.graphWidth - mx * expandFactor
                return <polyline 
                                fill="none"
                                stroke="#00000040"
                                strokeWidth="1"
                                points={`${x},0 ${x},${this.st.graphHeight}`}
                            />
            })
            markers = majorMarkers.map(mx => {
                const x = this.st.graphWidth - mx * expandFactor
                return <polyline 
                                fill="none"
                                stroke="#00000090"
                                strokeWidth="2"
                                points={`${x},0 ${x},${this.st.graphHeight}`}
                            />
            })
        }

        const delta = (currentPrice - previousClosingPrice) * 100/previousClosingPrice;
        let arrowStyle:CSSProperties = {
            color: "gray"  
        }
        const swing = Math.min(10, Math.abs(delta))/10.0;
        const colorPart = ((140) + Math.floor(115 * swing)).toString(16).padStart(2,"0")
        const grayPart = ((140) - Math.floor(100 * swing)).toString(16).padStart(2,"0")
        if(delta > 0) arrowStyle.color = `#${grayPart}${colorPart}${grayPart}`
        else arrowStyle.color = `#${colorPart}${grayPart}${grayPart}`

        return <div className={styles.stockRowFrame}>
            <Row className={styles.stockRowContents}>
                <div className={styles.stockNameBox}>
                    <Row>
                        <SafeLink 
                            link={`https://www.google.com/search?q=${context.name}`} 
                            text={<div className={styles.stockName}>{context.name}</div>} />
                        <div className={styles.arrowContainer} >
                            {
                                delta <= 0 
                                    ?   <ImArrowDown className={styles.arrow}  style={arrowStyle}/>
                                    :   <ImArrowUp className={styles.arrow} style={arrowStyle}/>
                            }
                            
                            <div className={styles.arrowText}>{delta.toFixed(1)}%</div>
                        </div>

                    </Row>
                </div>
                <div className={styles.stockGraphBox}>
                    <svg className={styles.stockGraph} id={this.id}>
                        {volumeShade}
                        {ticks}
                        {markers}
                        <polyline
                            fill="none"
                            stroke="#00dd00"
                            strokeWidth="2"
                            points={points}
                        />
                    </svg>
                </div>
                <div className={styles.stockValueBox}>
                    <div className={styles.highLowValue}>{highestValue.toFixed(2)}</div>
                    <div className={styles.stockPrice}>{price}</div>
                    <div className={styles.highLowValue}>{lowestValue.toFixed(2)}</div>
                </div>
                <div className={styles.stockButtonBox}>
                    <TiDelete onClick={this.props.onDelete} />
                </div>
            </Row>
        </div>
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
                    data.subscriptions.map(s => <div key={s.name}>
                            <StockComponent 
                                context={s}
                                onDelete={()=>data.removeSubscription(s)}
                            />
                        </div>)
                }
                <div style={{margin: "5px"}}>
                    <BsPlusSquare onClick={()=>addTicker()} />
                </div>

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

