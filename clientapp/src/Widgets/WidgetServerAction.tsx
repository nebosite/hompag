import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { registerWidget, WidgetType } from "widgetLibrary";
import { BsPlusSquare } from "react-icons/bs"
import { TiDelete } from "react-icons/ti"
import Combobox from "Components/ComboBox";
import { RestHelper } from "helpers/RestHelper";
import appStyles from '../AppStyles.module.css';
import WidgetBase from "./WidgetBase";



export class WidgetServerActionData extends WidgetModelData
{ 
    __t = "WidgetServerActionData" // Help the serializer know the type when code is minimized
    @observable private _pickedActions: string[] = observable([])
    get pickedActions() {return this._pickedActions}

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

    // --------------------------------------------------------------------------------------------------------------------------------------
    // removeAction
    // --------------------------------------------------------------------------------------------------------------------------------------
    removeAction(name: string) {
        const index = this.pickedActions.indexOf(name);
        if(index === -1)
        {
            console.log(`WEIRD: Action was not present in pickedActions: ${name}`)
            return;
        }
        this.updateMe(()=> this.pickedActions.splice(index,1)) 
    }
}

interface ActionListResponse{
    errorMessage?: string
    data?: {
        actions: {name: string}[]
    }
}
export class ServerActionTransientState
{
    myState:    ObservableState<string>;


    @observable private _pickingAction = false;
    get pickingAction() {return this._pickingAction}
    set pickingAction(value: boolean) { action(()=>this._pickingAction = value)()}

    @observable pickableItems: string[] = ["foo", "bar"]

    private api = new RestHelper("/api/actions/");
   

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        makeObservable(this);
        this.myState = new ObservableState<string>("myState", stateMaker)
        this.myState.value = "defaultValue"

        setTimeout(async ()=>{
            const serverResponse = await this.api.restGet<ActionListResponse>("list");
            if(!serverResponse || serverResponse.errorMessage) 
            {
                console.log(`OH NO: Nothing from the server.  (${serverResponse?.errorMessage})`)
            }
            else {
                action(()=>this.pickableItems = serverResponse.data.actions.map(a => a.name))()
            }
        },0)
    } 

    // -------------------------------------------------------------------
    // executeAction
    // -------------------------------------------------------------------
    executeAction(name: string) {
        this.api.restPut(`execute/${name}`)
    }
}


// --------------------------------------------------------------------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------------------------------------------------------------------
@observer
export default class WidgetServerAction 
extends WidgetBase<{context: WidgetContainer, scale: number}> 
{    
    transientState: ServerActionTransientState;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        // eslint-disable-next-line react/jsx-pascal-case
        registerWidget(WidgetType.ServerAction, (c,s) => <WidgetServerAction context={c} scale={s} />, "WidgetServerActionData", () => new WidgetServerActionData())
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer, scale: number})
    {
        super(props);
        this.transientState = new ServerActionTransientState(props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // renderContent
    // -------------------------------------------------------------------
    renderContent() {
        const tState = this.transientState;
        const data = this.props.context.ref_widget.data as WidgetServerActionData; 

        const selectItem = (item: string) => {
            console.log(`Selected ${item}`)
            data.addAction(item);
            tState.pickingAction = false;
        }

        const pickableItems = tState.pickableItems
            .filter(i => data.pickedActions.indexOf(i) === -1)
            .map(i => ({value: i, label: i}))

        const renderAction = (action: string) => (
                <div key={action} className={appStyles.ServerActionItem}>
                    <div className={appStyles.testRow}>
                        <div 
                            className={appStyles.name} 
                            onClick={()=>{this.transientState.executeAction(action)}}
                        >
                            {action}
                        </div>
                        <div className={appStyles.deleteButton} onClick={()=> data.removeAction(action)}><TiDelete /></div>
                    </div>
                </div>
            )

        return (
            <div>
                <div style={{paddingTop:"5px"}}>
                    {
                        data.pickedActions.map(a => renderAction(a))
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
    }

    // -------------------------------------------------------------------
    // renderConfigUI - this is for special configuration
    // -------------------------------------------------------------------
    renderConfigUI() {
        return <div>Note: Server Actions are defined in config/Actions.json in the server data folder.</div>
    }
}

