import Row from "Components/Row";
//import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import {BsPlusSquare} from "react-icons/bs"
import { DialogControl } from "Components/DialogControl";
import React, { CSSProperties } from "react";
import { registerProperty, registerType } from "models/hompagTypeHelper";
import styles from './WidgetPinger.module.css';
import { AppModel } from "models/AppModel";


class PingThing {
    __t = "PingThing" // Help the serializer know the type when code is minimized
    @observable _id = Date.now()

    @observable private _name: string = ""
    get name() {return this._name}
    set name(value) {action(()=>{this._name = value})()}

    @observable private _url: string = ""
    get url() {return this._url}
    set url(value) {action(()=>{this._url = value})()}

    @observable  private _regex = ""
    get regex() {return this._regex ?? ""}
    set regex(value) {action(()=>{this._regex = value})()}

    @observable private state_pingStatus = "";
    get pingStatus() {return this.state_pingStatus}
    set pingStatus(value) {action(()=>{this.state_pingStatus = value})()}

    @observable private state_span = 0;
    get span() {return this.state_span}
    set span(value) {action(()=>{this.state_span = value})()}

    @observable private state_latency = 0;
    get latency() {return this.state_latency}
    set latency(value) {action(()=>{this.state_latency = value})()}

    @observable private state_error: any;
    get error() {return this.state_error}
    set error(value) {action(()=>{this.state_error = value})()}

    get spanText() {
        let t = this.span;
        const days = Math.floor(t / (24 * 3600 * 1000))
        t -= (days * 24 * 3600 * 1000)
        const hours = Math.floor(t/(3600*1000))
        t -= hours * (3600 * 1000)
        const minutes = Math.floor(t/(60 * 1000));
        t -= minutes * (60 * 1000)
        const seconds = Math.floor(t/(1000));

        return `${(days ? days + "d " : "")} ${hours.toString().padStart(2,"0")}:${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`

    }

    get package() {
        return  {
            id:this._id, 
            url: this.url, 
            regex: this.regex
        }
    }

    constructor() {
        makeObservable(this);
    }
}

interface ServerPingInfo {
    id: number, 
    status: string, 
    span: number,
    latency?: number,
    error?: any
}

export class WidgetPingerData extends WidgetModelData
{
    __t = "WidgetPingerData" // Help the serializer know the type when code is minimized
    @observable private _myThing: string = "defaultValue"
    get myThing() {return this._myThing}
    set myThing(value) { 
        if(value !== this._myThing) this.updateMe(()=>{this._myThing = value})
    }

    @observable pingTargets = observable([] as PingThing[])

    // properties that start with "ref_" or "state_" will not be serialized to the server
    // ref_someThing: ComplexReferenceType
    // state_someOtherThing:  AnotherTypeWeDontWantToSerialize
    @observable private state_editPing: PingThing
    get editPing() {return this.state_editPing}
    set editPing(value) { action(()=>{this.state_editPing = value})() }

    ref_appModel:AppModel;

    constructor(appModel: AppModel) {
        super();
        this.ref_appModel = appModel
        appModel.addMessageListener("Ping", (data: ServerPingInfo) => {
            const target = this.pingTargets.find(t => t._id === data.id);
            if(target) {
                target.pingStatus = data.status;
                target.span = data.span;
                target.latency = data.latency ?? 0
                target.error = data.error

                if(data.error) {
                    console.log(`Ping error on ${target.url}: ${JSON.stringify(data.error)} `)
                }
            }
        })
        makeObservable(this);
    }

    cancelNewPinger(deleteIfPresent: boolean = false) { 
        if(deleteIfPresent) {
            const deleteMeIndex = this.pingTargets.indexOf(this.editPing)
            if(deleteMeIndex > -1) {
                this.updateMe(()=>{this.pingTargets.splice(deleteMeIndex,1)})
            }
        }
        this.editPing = undefined 
    }

    acceptNewPinger() { 
        this.pingOne(this.editPing)
        if(!this.pingTargets.find(p => p._id === this.editPing._id))
        {
            this.updateMe(()=>{this.pingTargets.push(this.editPing)}) 
        }
        else {
            this.updateMe(()=>{})
        }
        this.editPing = undefined 
    } 

    pingOne(pingMe: PingThing) {
        this.ref_appModel.post("ping", pingMe.package)  
    }

    pingAll() {
        this.pingTargets.forEach(p =>this.pingOne(p))
    }
}

registerProperty( "WidgetPingerData", "pingTargets", (t,p,o) => observable(o as PingThing[]))

// TODO: Use this class to store data that should not be persisted, but should be shared
// with widgets of the same instance on other pages.  
export class PingerTransientState
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
export default class WidgetPinger 
extends WidgetBase<{context: WidgetContainer, scale: number}> 
{    
    transientState: PingerTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType.Pinger, (c,s) => <WidgetPinger context={c} scale={s} />, "WidgetPingerData", (bag) => new WidgetPingerData(bag.get("theApp")))
        registerType("PingThing", ()=>new PingThing())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer, scale: number})
    {
        super(props);
        this.transientState = new PingerTransientState(props.context.widgetId, props.context.getStateMaker())
        const data = (props.context.ref_widget.data as WidgetPingerData)
        data.pingAll();
    }

    // -------------------------------------------------------------------
    // renderContent - This is for normal widget content
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const data = context.ref_widget.data as WidgetPingerData; 
        const style = {
            background: context.colorTheme.color(context.backGroundColorIndex, context.backGroundColorValue),
            color: context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue),
        }
        const labelStyle:CSSProperties = { width: "100px", textAlign: "right"}

        const addPing =(pinger: PingThing = undefined) => {
            data.editPing = pinger ?? new PingThing();
        }

        const editName = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editPing.name = e.target.value; 
        const editUrl = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editPing.url = e.target.value; 
        const editRegex = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editPing.regex = e.target.value; 

        const newPingerOK = () => data.acceptNewPinger();
        const newPingerCancel = () => data.cancelNewPinger();
        const deletePinger = () => data.cancelNewPinger(true);

        let regexError:string;
        if(data.editPing?.regex?.trim()) 
        {
            try {
                new RegExp(data.editPing.regex)
            }
            catch(err) {
                const errText = `${err}`;
                let errorSpot = errText.indexOf(data.editPing.regex)
                if(errorSpot === -1) { 
                    errorSpot = errText.lastIndexOf(":") + 1;
                }
                else errorSpot += data.editPing.regex.length + 2;

                regexError = errText.substring(errorSpot);
            }
        }
        const regexStyle: CSSProperties = {
            width: "300px",
            background: regexError ? "red" : undefined
        }

        return (
            <div className={styles.pingerControl} style={style}>
                { data.editPing
                    ? <DialogControl style={{width: "400px"}} >
                        <div style={{margin: "10px"}}>Add a new ping target</div>
                        <Row>
                            <div style={labelStyle}>Name:</div>
                            <input  type="text" style={{width: "300px"}} value={ data.editPing.name} onChange={editName}  /> 
                        </Row>
                        <Row>
                            <div style={labelStyle}>URL/host:</div>
                            <input  type="text" style={{width: "300px"}} value={ data.editPing.url} onChange={editUrl}  /> 
                        </Row>
                        <Row>
                            <div style={labelStyle}>Validation Regexp:</div>
                            <input  type="text" style={regexStyle} value={ data.editPing.regex} onChange={editRegex}  /> 
                        </Row>
                        <div style={{color: "red", marginLeft: "105px"}}>&nbsp;{regexError}</div>
                        <Row style={{margin: "10px"}}>
                            <button style={{marginRight: "30px"}} onClick={newPingerOK}>OK</button>
                            <button style={{marginRight: "30px"}} onClick={newPingerCancel}>Cancel</button>
                            <button onClick={deletePinger}>Delete</button>
                        </Row>
                    </DialogControl>
                    : null
                }
                {
                    data.pingTargets.map(p => {
                        let itemStyle: CSSProperties = {}
                        switch(p.pingStatus)
                        {
                            case "down": itemStyle = {background: "red", color: "yellow"}; break;
                            case "delayed": itemStyle = {background: "yellow", color: "black"}; break;
                        }
                        return <div key={p._id} onClick={()=>addPing(p)}>
                                    <Row style={{...itemStyle}} > 
                                    <div className={`${styles.pingColumn} ${styles.pingNameColumn}`} >{p.name}</div>
                                    <div className={`${styles.pingColumn} ${styles.latencyColumn}`} >{`${p.latency}`}ms</div>
                                    <div className={`${styles.pingColumn} ${styles.uptimeColumn}`} >{p.spanText}</div>
                                </Row>
                            </div> 
                    })
                }
                <div style={{margin: "5px"}}>
                    <BsPlusSquare onClick={()=>addPing()} />
                </div>
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

