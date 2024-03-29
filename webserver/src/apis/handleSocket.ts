
import { serverModel } from "..";
import * as WebSocket from 'ws';
import { Request } from "express";
import { ILogger } from "../helpers/logger";
import { IListener } from "../models/ServerModel";
import { ServerMessageType, StatePacket } from "hompag-common";
// import { errorCounts, serverModel, logger, throughPut } from "..";
// import { IClusterFunMessage } from "@clusterfun/clusterfun_lib";



const CLOSECODE_POLICY_VIOLATION = 1008;
// const CLOSECODE_WRONG_DATA = 1003;

// const WEBSOCKET_PROTOCOL_HEADER = 'sec-websocket-protocol';
// const SECRET_PREFIX = 'Secret';

let listenerCount = 0;
class WebSocketListener implements IListener
{
    name: string
    private _socket: WebSocket
    private _onClose: () => void
    private _closed = false;
    private _logger: ILogger;

    constructor(name: string, socket: WebSocket, logger: ILogger, onClose: ()=> void) {
        this._socket = socket;
        this.name = name;
        this._onClose = onClose;
        this._logger = logger;
    }

    //------------------------------------------------------------------------------------------
    // close
    //------------------------------------------------------------------------------------------
    close() {
        this._closed = true;
        if(this._socket) this._logger.logLine(`Closing socket: ${this.name}`)
        this._onClose();
    }

    //------------------------------------------------------------------------------------------
    // send
    //------------------------------------------------------------------------------------------
    async send(data: any) {
        if(this._closed) return;
        this._socket.send(JSON.stringify(data))
    }
}

// ---------------------------------------------------------------------------------
// Set up incoming socket request
// ---------------------------------------------------------------------------------
export function handleSocket(socket: WebSocket, req: Request, logger: ILogger) {
    try {
        logger.logLine(`New Socket Request`)
        const name = `listener_${listenerCount++}`
        const listener = new WebSocketListener(name, socket, logger, ()=> {serverModel.unregisterListener(name)});
        serverModel.registerListener(listener);

        socket.onmessage = (msgRaw:any) => {
            try {
                const jsonText = msgRaw.data;
                const msgParsed = JSON.parse(jsonText) as {type: ServerMessageType, data: StatePacket};
                const returnMessage = serverModel.handleMessage(msgParsed);
                if(returnMessage) {
                    // If the instance matches, the receiver will ignore it,
                    // so set the instance to 0
                    returnMessage.data.instance = 0 
                    listener.send(returnMessage);
                }
            }
            catch(err)
            {
                logger.logError(`Messaging error: ${err}`)
            }
        };

        socket.onerror = err => {
            logger.logError(`Websocket error: ${err}`)   
        }
        
        socket.on('close', (reason) => { listener.close(); });
    } catch (e: any) {
        logger.logError(e)
        socket.close(CLOSECODE_POLICY_VIOLATION);
        return;
    }
    
};