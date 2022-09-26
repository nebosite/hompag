import { ILogger, LoggerPrefixer } from "../helpers/logger";
import { restCallText } from "../helpers/rest"; 
import * as ping from "ping"
import * as dns from "dns"


export interface PingCommand 
{
    id: number;
    url: string;
    regex?: string;
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
        this.pingWorker();
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
        const start = Date.now()
        await new Promise<void>((resolve) => {
            ping.promise.probe(resolvedAddress, { timeout: 10, min_reply: 1 })
                .then(function (res) {
                    if(!res.alive) {
                        pingError = "Server is no alive"
                    }
                    pingTime = Date.now() - start;
                })
                .catch((err:any) => {
                    pingError = `${err}`;
                }) 
        })

        if(pingError) throw Error("PingHost: " + pingError);
        return pingTime;
    }

    //------------------------------------------------------------------------------------------
    // 
    //------------------------------------------------------------------------------------------
    async attemptPing (command: PingCommand) {

        if(command.url.toLowerCase().startsWith("http")) {
            const startTime = Date.now();
            const response = (await restCallText("GET", undefined, command.url));
            if(!response) throw Error("Ping got back null response")
            if(command.regex && command.regex.trim() != "") {
                if(!response.match(command.regex)) throw("Ping text did not match")
            }
            return Date.now() - startTime;
        }
        else {
            let error:any = undefined;
            const result = await this.pingServer(command.url).catch(err => error = err)
            if(error) throw Error(error);
            return result;
        }
    }


    //------------------------------------------------------------------------------------------
    // pingTask
    //------------------------------------------------------------------------------------------
    async pingWorker () {
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
                        const latency = await this.attemptPing(p.command);
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
        setTimeout(()=>this.pingWorker(), 1000)
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

