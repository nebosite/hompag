
// -------------------------------------------------------------------
// IDataChangeListener
// -------------------------------------------------------------------
export interface IDataChangeListener {
    readonly isOpen: boolean;
    readonly isClosed: boolean;
    readonly closeCode: number;
}

export interface DataChangeAlert
{
    type: string;
    id: string;
}

// -------------------------------------------------------------------
// WebSocketListener
// -------------------------------------------------------------------
export class WebSocketListener implements IDataChangeListener {
    isOpen: boolean = false;
    isClosed: boolean = false;
    closeCode: number = 0;
    private _websocket: WebSocket;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(handler: (type: string, id: string) => void)
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

        this._websocket.addEventListener("message", (ev: { data: string; }) => {
            const message = JSON.parse(ev.data) as DataChangeAlert;
            handler(message.type, message.id);
        })
    }

    // send(payload: string) {
    //     let retries = 8;
    //     let backoffTime = 50;

    //     const delayedSend = () => {
    //         if(this._websocket.readyState === 1)
    //         {
    //             this._websocket.send(payload);      
    //         }
    //         else 
    //         {
    //             retries--;
    //             if(retries <= 0)
    //             {
    //                 console.log("ERROR: out of retires sending " + payload)
    //             }
    //             backoffTime *= 2;
    //             console.log(`Socket not ready.  Backing off ${backoffTime}ms`)
    //             setTimeout(delayedSend,backoffTime);
    //         }
    //     }
    //     setTimeout(delayedSend,0);
    // }
}

