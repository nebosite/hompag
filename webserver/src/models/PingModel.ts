import { ILogger, LoggerPrefixer } from "../helpers/logger";
import { restCallText } from "../helpers/rest";


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
    // pingTask
    //------------------------------------------------------------------------------------------
    async pingTask () {
        try {
            const work = [...this.pings]
            work.forEach(async(p) => {
                // Remove pings that are old
                if(Date.now() > p.terminationTime) {
                    this.pings.splice(this.pings.indexOf(p),1)
                }

                // ping if it's time
                if(Date.now() > p.nextPingTime) {
                    p.nextPingTime = Date.now() + 59000 + (Math.random() * 2000);
                    try {
                        await restCallText("GET", undefined, p.command.url) 
                        p.lastUpTime = Date.now();
                        this.sendAlert({
                            type: "Ping", 
                            data: {
                                id: p.command.id,
                                status: "up",
                                span: Date.now() - p.lastDownTime
                            }})
                    }
                    catch (err) {
                        p.lastDownTime = Date.now();
                        this.sendAlert({
                            type: "Ping", 
                            data: {
                                id: p.command.id,
                                status: "down",
                                span: Date.now() - p.lastUpTime
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
        let foundTask = this.pings.find(p=> p.command.id === command.id)
        if(!foundTask) {
            foundTask = {
                nextPingTime: 0, 
                lastDownTime: Date.now(),
                lastUpTime: Date.now(),
                terminationTime: Date.now() + 8 * 3600 * 1000,
                command}
            this.pings.push(foundTask);
        }
        foundTask.nextPingTime = 0;
    }
}