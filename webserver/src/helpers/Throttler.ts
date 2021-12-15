import { doNothing } from "./asyncHelper";

export class Throttler {
    doNothing = doNothing;
    getTime = () => Date.now();

    requestTimes: number[] = []
    requestsPerMinute: number;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(requestsPerMinute: number)
    {
        this.requestsPerMinute = requestsPerMinute;
    }

    //------------------------------------------------------------------------------------------
    // runThrottled
    //------------------------------------------------------------------------------------------
    async runThrottled(action: () => Promise<void>) {

        this.requestTimes.push(this.getTime())
        let callsLastMinute = 0;
        let oneMinuteAgo = this.getTime() - 60000;
        let oldestCallTime = oneMinuteAgo;
        for(let i = this.requestTimes.length-1; i >= 0; i--)
        {
            if(this.requestTimes[i] > oneMinuteAgo) {
                oldestCallTime = this.requestTimes[i]
                callsLastMinute++
            }
            else break;
        }

        if(callsLastMinute > this.requestsPerMinute)
        {
            await this.doNothing(oldestCallTime - oneMinuteAgo)
        }

        await action()   
    }
}