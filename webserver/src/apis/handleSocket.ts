
import { serverModel } from "..";
import * as WebSocket from 'ws';
import { Request } from "express";
import { ILogger } from "../helpers/logger";
import { IListener } from "../models/ServerModel";
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

        // ws.on('message', function (msgRaw) {
        //         const jsonText = msgRaw.toString();
        //         const msgParsed = JSON.parse(jsonText) as IClusterFunMessage;
        // });
        
        socket.on('close', (reason) => { listener.close(); });
    } catch (e) {
        logger.logError(e)
        socket.close(CLOSECODE_POLICY_VIOLATION);
        return;
    }
    
};