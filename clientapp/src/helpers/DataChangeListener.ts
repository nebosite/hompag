
// -------------------------------------------------------------------
// IDataChangeListener
// -------------------------------------------------------------------
export interface IDataChangeListener {
    readonly isOpen: boolean;
    readonly isClosed: boolean;
    readonly closeCode: number;
    send(sendMe: any): void;
    addListener(type: string, listener: (data: any)=>void):void
    receivedCount: number;
    receivedBytes: number;
    sentCount: number;
    sentBytes: number;

}

// -------------------------------------------------------------------
// WebSocketListener
// -------------------------------------------------------------------
export class WebSocketListener implements IDataChangeListener {
    isOpen: boolean = false;
    isClosed: boolean = false;
    closeCode: number = 0;
    private _websocket: WebSocket;
    private _listeners = new Map<string, ((data: any)=>void)[]>()

    receivedCount = 0
    receivedBytes = 0;
    sentCount = 0
    sentBytes = 0;
    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor()
    {
        const url = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + window.location.host + "/subscribe";
        console.log(`Attempting socket to: ${url}`)
        this._websocket = new WebSocket(url, []);

        this._websocket.addEventListener("open", (ev) => {
            console.log("socket opened")
            this.isOpen = true;
        });

        this._websocket.addEventListener("close", (ev) => {
            console.log("socket closed")
            this.isClosed = true;
            this.closeCode = ev.code;
        })

        this._websocket.addEventListener("message", (ev: { data: string }) => {
            try{
                this.receivedCount++;
                this.receivedBytes += ev.data.length;
                const data = JSON.parse(ev.data) as {type: string, data: any}
                const type = data.type;
                if(!type) throw Error("Missing socket data type")

                const listeners = this._listeners.get(type);
                if(listeners) {
                    listeners.forEach(l => l(data.data))
                }
                else {
                    console.log(`No listener for type '${type}`)
                }
            }
            catch(err) {
                console.log(`Socket receive error: ${err}`)
            }
        })
    }

    // -------------------------------------------------------------------
    // addListener
    // -------------------------------------------------------------------
    addListener(type:string, listener: (data: any)=>void)
    {
        if(!this._listeners.has(type)){
            this._listeners.set(type, [])
        }
        this._listeners.get(type)!.push(listener);
    }

    // -------------------------------------------------------------------
    // send
    // -------------------------------------------------------------------
    send(sendMe: any) {
        let payload = JSON.stringify(sendMe);
        let retries = 8;
        let backoffTime = 50;
        this.sentCount++;
        this.sentBytes += payload.length;

        const delayedSend = () => {
            if(this._websocket.readyState === 1)
            {
                this._websocket.send(payload);      
            }
            else 
            {
                retries--;
                if(retries <= 0)
                {
                    console.log("ERROR: Gave up trying to send: " + payload)
                }
                backoffTime *= 2;
                setTimeout(delayedSend,backoffTime);
            }
        }
        setTimeout(delayedSend,0);
    }
}

