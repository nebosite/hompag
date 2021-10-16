import { ILogger, LoggerPrefixer } from "../helpers/logger";
var ping = require ("net-ping");
var dns = require('dns'); 

export interface PingCommand 
{
    id: number;
    url: string;
}

interface PingTask {
    nextPingTime: number;
    command: PingCommand;
    lastDownTime: number;
    lastUpTime: number;
    idleTime: number;
    terminationTime: number;
}

export class PingModel
{
    private _logger: ILogger;

    pings: PingTask[]  = []

    sendAlert: (message: { type: string; data: any; })=>void
    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: ILogger, sendAlert: (message: { type: string; data: any; })=>void)
    {
        this._logger = new LoggerPrefixer( logger, "Pinger");
        this.sendAlert = sendAlert;
        this.pingTask();
    }

    //------------------------------------------------------------------------------------------
    // pingServer
    //------------------------------------------------------------------------------------------
    async pingServer(hostName: string) {
        let pingError: any = undefined;
        let resolvedAddress: string = "";
        await new Promise<void>((resolve) => {
            dns.lookup(hostName, (err:any, address: string) => {
                if(err) pingError = err;
                else resolvedAddress = address;
                resolve();
            })
        })

        if(pingError) throw Error("DNS: " + pingError);

        let pingTime = 0;
        await new Promise<void>((resolve) => {
            var session = ping.createSession ();

            session.pingHost (resolvedAddress, (error:any, target:any, sent:number, rcvd:number) => {
                if (error) {
                    pingError = error;
                }                               
                else {
                    pingTime = rcvd - sent;
                }
                resolve();
            });                            
        })

        if(pingError) throw Error("PingHost: " + pingError);
        return pingTime;
    }

    //------------------------------------------------------------------------------------------
    // pingTask
    //------------------------------------------------------------------------------------------
    async pingTask () {
        try {
            const work = [...this.pings]
            work.forEach(async(p) => {
                // Remove pings that are old (probably deleted from the client)
                if(Date.now() > p.terminationTime) {
                    this.pings.splice(this.pings.indexOf(p),1)
                }

                // ping if it's time
                if(Date.now() > p.nextPingTime) {
                    p.nextPingTime = Date.now() + 59000 + (Math.random() * 2000);
                    if(Date.now() > p.idleTime) p.nextPingTime += 10 * 60 * 1000;  // Add 10 minutes if idle
                    try {
                        let error:any = undefined;
                        const latency = await this.pingServer(p.command.url).catch(err => error = err)
                        if(error) throw Error(error);

                        p.lastUpTime = Date.now();
                        this.sendAlert({
                            type: "Ping", 
                            data: {
                                id: p.command.id,
                                status: "up",
                                span: Date.now() - p.lastDownTime,
                                latency
                            }})
                    }
                    catch (err) {
                        p.lastDownTime = Date.now();
                        this.sendAlert({
                            type: "Ping", 
                            data: {
                                id: p.command.id,
                                status: "down",
                                span: Date.now() - p.lastUpTime,
                                error: `${err}`
                            }})
                    }
                }
            })
        }
        catch(err) {
            this._logger.logError(`Ping error: ${(err as any)}`)
        }
        setTimeout(()=>this.pingTask(), 1000)
    }

    //------------------------------------------------------------------------------------------
    // handlePing
    //------------------------------------------------------------------------------------------
    handlePing(command: PingCommand)  {
        const idleTime = Date.now() + 2 * 3600 * 1000
        const terminationTime = Date.now() + 48 * 3600 * 1000
        let foundTask = this.pings.find(p=> p.command.id === command.id)
        if(!foundTask) {
            foundTask = {
                nextPingTime: 0, 
                lastDownTime: Date.now(),
                lastUpTime: Date.now(),
                idleTime,
                terminationTime,
                command}
            this.pings.push(foundTask);
        }
        foundTask.nextPingTime = 0;
        foundTask.command = command;
        foundTask.idleTime = idleTime
        foundTask.terminationTime = terminationTime
    }
}

