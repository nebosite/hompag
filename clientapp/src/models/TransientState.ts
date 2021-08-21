import { observable, action, makeObservable } from "mobx";

// -------------------------------------------------------------------
// This class simplifies how to track transient state as an observable.
// -------------------------------------------------------------------
export class ObservableState<T>
{
    @observable private _value: T 
    get value() {return this._value}
    set value(value:T) {
        if(this._value === value) return;
        action(()=>{
            this._value = value;
            this._valueHandler.send(value)
        })();
    }    

    private _valueHandler: TransientStateHandler<T>
    constructor(name: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        makeObservable(this);
        this._valueHandler = stateMaker<T>(name, (token) => action(()=>this._value = token)())
    }
}

// -------------------------------------------------------------------
// TransientState is for items on widgets that change frequently, but
// should not be saved to the permanent store.  The server keeps a 
// copy of the state in RAM only, so if the server reboots the state is gone
// -------------------------------------------------------------------
export class TransientStateHandler<T> 
{
    instance = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    id: string;
    name: string;
    handler: (data: T) => void;
    sender: (id: string, name: string, instance: number, value: any) => void

    constructor(
        id: string,
        name: string,
        handler: (data: T)=> void,
        sender: (id: string, name: string, instance: number, value: any) => void
    ){
        this.id = id;
        this.name = name;
        this.handler = handler;
        this.sender = sender;
    }

    receive(data: any) {
        this.handler(data as T);
    }

    send(value: any): void {
        this.sender(this.id, this.name, this.instance, value )
    }

}

