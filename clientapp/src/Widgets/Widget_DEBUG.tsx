import Row from "Components/Row";
import { GLOBALS } from "index";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { AppModel } from "models/AppModel";
import { TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import styles from './Widget_DEBUG.module.css';
declare var performance: any;



// TODO: Use this class to store data that should be persisted from
// session to session.  ie: permanent changes
export class WidgetDebugData extends WidgetModelData
{ 
    __t = "WidgetDebugData" // Help the serializer know the type when code is minimized
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
//      "WidgetDebugData", // Name of the data class
//      "someCollection",       // Name of the property
//      (type,propertyName,objectFromJson) => {
//          return observable(objectFromJson as MyCollectionType[])
//      })

// TODO: Use this class to store data that should not be persisted, but should be shared
// with widgets of the same instance on other pages.  
export class DebugTransientState
{
    //myState:    ObservableState<string>;

    @observable  private _renderFrequency = 0
    get renderFrequency() {return this._renderFrequency}
    set renderFrequency(value)  {this.addAnimation(new AnimatedValue(this._renderFrequency, value,(nv)=>{this._renderFrequency = nv;}))}
    
    @observable  private _rootRenderFrequency = 0
    get rootRenderFrequency() {return this._rootRenderFrequency}
    set rootRenderFrequency(value) {this.addAnimation(new AnimatedValue(this._rootRenderFrequency, value,(nv)=>{this._rootRenderFrequency = nv;}))}
    
    @observable  private _sendFrequency = 0
    get sendFrequency() {return this._sendFrequency}
    set sendFrequency(value) {this.addAnimation(new AnimatedValue(this._sendFrequency, value,(nv)=>{this._sendFrequency = nv;}))}
    
    @observable  private _receiveFrequency = 0
    get receiveFrequency() {return this._receiveFrequency}
    set receiveFrequency(value) {this.addAnimation(new AnimatedValue(this._receiveFrequency, value,(nv)=>{this._receiveFrequency = nv;}))}
    
    @observable  private _sendBandwidth = 0
    get sendBandwidth() {return this._sendBandwidth}
    set sendBandwidth(value) {this.addAnimation(new AnimatedValue(this._sendBandwidth, value,(nv)=>{this._sendBandwidth = nv;}))}
    
    @observable  private _receiveBandwidth = 0
    get receiveBandwidth() {return this._receiveBandwidth}
    set receiveBandwidth(value){this.addAnimation(new AnimatedValue(this._receiveBandwidth, value,(nv)=>{this._receiveBandwidth = nv;}))}
    
    @observable  private _messageBandwidth = 0
    get messageBandwidth() {return this._messageBandwidth}
    set messageBandwidth(value) {this.addAnimation(new AnimatedValue(this._messageBandwidth, value,(nv)=>{this._messageBandwidth = nv;}))}
    
    @observable  private _memorySize = 0
    get memorySize() {return this._memorySize}
    set memorySize(value) {this.addAnimation(new AnimatedValue(this._memorySize, value,(nv)=>{this._memorySize = nv;}))}

    renderCount = 0;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(appModel: AppModel, widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        makeObservable(this)
        // this.myState = new ObservableState<string>("myState", stateMaker)
        // this.myState.value = "defaultValue"

        let lastFrameCount = 0
        let lastGlobalRenderCount = 0;
        let lastTraffic = {
            sentCount: 0,
            sentBytes: 0,
            receivedCount: 0,
            receivedBytes: 0
        }
        const ticker = () => {
            
            action(()=>{
                const frames = this.renderCount - lastFrameCount;
                lastFrameCount = this.renderCount;
                this.renderFrequency = this.renderFrequency * 0.5 + frames * 0.5;
                
                const globalFrames = GLOBALS.renderCount - lastGlobalRenderCount;
                lastGlobalRenderCount = GLOBALS.renderCount;
                this.rootRenderFrequency = this.rootRenderFrequency * 0.5 + globalFrames * 0.5;
                
                const newTraffic = appModel.trafficCounts;
                const sentCount = newTraffic.sentCount - lastTraffic.sentCount;
                this.sendFrequency = this.sendFrequency * 0.5 + sentCount * 0.5;
                const sentBytes = newTraffic.sentBytes - lastTraffic.sentBytes;
                this.sendBandwidth = this.sendBandwidth * 0.5 + sentBytes * 0.5;
                const receivedCount = newTraffic.receivedCount - lastTraffic.receivedCount;
                this.receiveFrequency = this.receiveFrequency * 0.5 + receivedCount * 0.5;
                const receivedBytes = newTraffic.receivedBytes - lastTraffic.receivedBytes;
                this.receiveBandwidth = this.receiveBandwidth * 0.5 + receivedBytes * 0.5;
                lastTraffic = newTraffic

                this.memorySize = this.memorySize * 0.5 + performance.memory.usedJSHeapSize * 0.5
            })()
            setTimeout(ticker, 1000); 
        }

        ticker();

    } 

    logRender() {
        this.renderCount++;
    }


    animations: AnimatedValue[] = []
    active = false;
    //--------------------------------------------------------------------------------------
    // 
    //--------------------------------------------------------------------------------------
    addAnimation(animation: AnimatedValue) {
        this.animations.push(animation)

        if(!this.active) {
            this.active = true;

            const animator = () => {
                if(this.animations.length > 0) {
                    action(()=> {
                        const keep:AnimatedValue[] = []
                        for(const item of this.animations) {
                            item.animate()
                            if(!item.finished) {
                                keep.push(item)
                            }
                        }
                        this.animations = keep;
                    })()
                    setTimeout(animator, 100)
                }
                else {
                    this.active = false;
                }
            }
            animator();
        }
    }
}

class AnimatedValue {
    startTime = Date.now()
    endTime = Date.now() + 1000
    start: number;
    delta: number;
    setValue: (value: number)=>void;
    finished = false;

    //--------------------------------------------------------------------------------------
    // 
    //--------------------------------------------------------------------------------------
    constructor(oldValue: number, newValue: number, setValue: (value: number)=> void) {
        this.start = oldValue;
        this.delta = newValue - oldValue;
        this.setValue = setValue;
    } 

    //--------------------------------------------------------------------------------------
    // 
    //--------------------------------------------------------------------------------------
    animate() {
        const progress = Date.now() - this.startTime;
        const duration_ms = this.endTime - this.startTime;
        let fraction = progress / duration_ms;
        if(fraction >= .999) {
            fraction = 1;
            this.finished = true;
        }
        const newValue = this.start + this.delta * fraction
        this.setValue(newValue);
    }
}


// --------------------------------------------------------------------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------------------------------------------------------------------
@observer
export default class WidgetDebug 
extends WidgetBase<{context: WidgetContainer, scale: number}> 
{    
    st: DebugTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType.Debug, (c,s) => <WidgetDebug context={c} scale={s} />, "WidgetDebugData", () => new WidgetDebugData())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer, scale: number})
    {
        super(props);
        this.st = new DebugTransientState(props.context.parentPage.ref_App, props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // renderContent - This is for normal widget content
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        this.st.logRender();
    
        //const data = this.props.context.ref_widget.data as WidgetDebugData;  
        const style = {
            background: context.colorTheme.color(context.backGroundColorIndex, context.backGroundColorValue),
            color: context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue),
            height: "100%"
        }

        const renderRow = (label:string | JSX.Element, value: number | string | JSX.Element) => {
            return <Row>
                    <div className={styles.nameColumn}>{label}</div>
                    <div className={styles.valueColumn}>{value}</div>
                </Row>
        }

        return (
            <div className={styles.debugControl} style={style}>
                <div><b>Debugging info</b></div>   
                {renderRow("Render Frequency", this.st.renderFrequency.toFixed(1))}
                {renderRow("Root Render Frequency", this.st.rootRenderFrequency.toFixed(1))}
                {renderRow("Send Frequency", this.st.sendFrequency.toFixed(1))}
                {renderRow("Send Bandwidth", this.st.sendBandwidth.toFixed(1))}
                {renderRow("Receive Frequency", this.st.receiveFrequency.toFixed(1))}
                {renderRow("Receive Bandwidth", this.st.receiveBandwidth.toFixed(1))}
                {renderRow("Memory Size", `${(this.st.memorySize / 1000000).toFixed(1)}MB`)}
            </div> 
        );
    }

    // -------------------------------------------------------------------
    // renderConfigUI - this is for special configuration
    // -------------------------------------------------------------------
    renderConfigUI() {
        return <div></div>
    }
}

