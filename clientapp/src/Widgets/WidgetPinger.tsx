import Row from "Components/Row";
import { ColorIndex, ColorValue } from "helpers/ColorTool";
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

    @observable private state_pingStatus = "";
    get pingStatus() {return this.state_pingStatus}
    set pingStatus(value) {action(()=>{this.state_pingStatus = value})()}

    @observable private state_span = 0;
    get span() {return this.state_span}
    set span(value) {action(()=>{this.state_span = value})()}

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

    constructor() {
        makeObservable(this);
    }
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
        appModel.addMessageListener("Ping", (data: {id: number, status: string, span: number}) => {
            const target = this.pingTargets.find(t => t._id === data.id);
            if(target) {
                target.pingStatus = data.status;
                target.span = data.span
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
        this.ref_appModel.post("ping", {id:this.editPing._id, url: this.editPing.url})
        if(!this.pingTargets.find(p => p._id === this.editPing._id))
        {
            this.updateMe(()=>{this.pingTargets.push(this.editPing)})
        }
        this.editPing = undefined 
    } 

    pingAll() {
        this.pingTargets.forEach(p =>
            {
                this.ref_appModel.post("ping", {id:p._id, url: p.url})
            })
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
extends WidgetBase<{context: WidgetContainer}> 
{    
    transientState: PingerTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType.Pinger, c => <WidgetPinger context={c} />, "WidgetPingerData", (bag) => new WidgetPingerData(bag.get("theApp")))
        registerType("PingThing", ()=>new PingThing())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer})
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
        const data = this.props.context.ref_widget.data as WidgetPingerData; 
        const style = {
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }
        const labelStyle:CSSProperties = { width: "80px", textAlign: "right"}

        const addPing =(pinger: PingThing = undefined) => {
            data.editPing = pinger ?? new PingThing();
        }

        const editName = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editPing.name = e.target.value; 
        const editUrl = (e: React.ChangeEvent<HTMLInputElement>) =>  data.editPing.url = e.target.value; 

        const newPingerOK = () => data.acceptNewPinger();
        const newPingerCancel = () => data.cancelNewPinger();
        const deletePinger = () => data.cancelNewPinger(true);

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
                            <div style={labelStyle}>URL:</div>
                            <input  type="text" style={{width: "300px"}} value={ data.editPing.url} onChange={editUrl}  /> 
                        </Row>
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
                        return <Row key={p._id} style={itemStyle} onClick={()=>addPing(p)}>
                            <div style={{width: "150px"}}>{p.name}</div>
                            <div style={{width: "50px"}}>{p.spanText}</div>
                        </Row>
                    })
                }
                <BsPlusSquare onClick={()=>addPing()} />
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

