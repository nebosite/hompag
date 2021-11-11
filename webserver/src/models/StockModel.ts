import { StockDetail, StockData } from "hompag-common";
import { doNothing } from "../helpers/asyncHelper";
import { ILogger } from "../helpers/logger";
import { ICache } from "./ServerModel";

var axios = require("axios").default;


function estNow() {
    const dateString = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});   
    const hourMatch = dateString.match(/, (\d\d):/)
    if(!hourMatch) {
        console.log(`BAD TIME: ${dateString}`)
        return {hour: 0}
    }
    const hourText = hourMatch[1]
    const hour = Number.parseInt(hourText)
    return {hour}
}


export interface IStockProvider{
    getData(symbol: string, cachedData: StockDetail[]): Promise<StockData>
}

export interface AxiosConfig {
    apiKey: string
}

export class AxiosStockProvder implements IStockProvider {

    apiKey?: string;
    logger: ILogger
    requestTimes: number[] = [0]

    constructor(config: AxiosConfig, logger: ILogger) {
        this.apiKey = config?.apiKey
        this.logger = logger
    }

    async throttle(requestsPerMinute: number)
    {
        let count = 0;
        const oneMinuteAgo = Date.now() - 60000;
        let timeToWait = 0;
        for(let i = this.requestTimes.length -1; i >= 0; i--)
        {
            count++;
            if(this.requestTimes[i] < oneMinuteAgo) break;
            if(count >= requestsPerMinute) {
                timeToWait = Date.now() - this.requestTimes[i]
                break;
            }


        }

        if(timeToWait) {
            this.logger.logLine(`Throttling stock api: ${timeToWait} ms`)
            await doNothing(timeToWait);
        }
        this.requestTimes.push(Date.now());
    }

    getData = async (symbol: string, data: StockDetail[]): Promise<StockData> => {
        if(!symbol) {
            throw Error("StockModel.getData: no symbol provided")
        }
        if(!this.apiKey) throw Error("No Axios API provided in config")


        const makeOptions = (params: any) =>
        {
            return {
                method: 'GET',
                url: 'https://twelve-data1.p.rapidapi.com/time_series',
                params: {
                    symbol,
                    format: 'json',
                    outputsize: '500',
                    ...params
                },
                headers: {
                    'x-rapidapi-host': 'twelve-data1.p.rapidapi.com',
                    'x-rapidapi-key': this.apiKey
                }
            }
        }


        const pushSamples = (seriesData: any[], earliest: number) => {
            for(const item of seriesData ) {
                const date = Date.parse(item.datetime + " EST")
                if(date > earliest) continue;
                const close = Number.parseFloat(item.close);
                const low = Number.parseFloat(item.low);
                const high = Number.parseFloat(item.high);
                const volume = Number.parseFloat(item.volume); 
                const pushMe = {
                        date:   date/1000,
                        values: [
                            Math.floor(close * 100)/100,
                            Math.floor(low * 100)/100,
                            Math.floor(high * 100)/100,
                            Number.parseFloat((volume / 1000000).toFixed(2))
                        ]
                    }
                data.push(pushMe)
            }
        }

        const logger = this.logger;

        const collect = async (params:any, earliest: number) => {

            const options:any = makeOptions(params)
            if(!options.params.symbol) {
                logger.logError(`ERROR: no symbol defined: ${JSON.stringify(options)}`)
                return;
            }
            this.logger.logLine(`Collecting axios data for ${symbol}:${options.params.interval} `)
            while(true) {
                await this.throttle(8);
                const stockResponse = await axios.request(options)
                    .catch((err: any) => {
                        if(`${err}`.indexOf("code 429") === -1)
                        {
                            logger.logError(`Exceeded q/min quota on ${symbol}`)
                        }
                        else
                        {
                            logger.logError(`Failed on stock query: ${err}`) 
                        }
                        return undefined;
                    })
                const series = stockResponse?.data?.values
                if(series) {
                    pushSamples(series, earliest) 
                    break;
                }
                await doNothing(5000);
            }
        }

        const oneDay = 24 * 3600 * 1000;

        if(data.length === 0) {
            await   collect({interval: '1month'}, Date.now() - oneDay * 80 )
        }
        const newest = data.length 
            ? data.map(i => i.date).reduce((p,c) => Math.max(p,c)) * 1000
            : 0;
        const ageInDays = (Date.now() - newest) / (24 * 3600 * 1000);
        if(ageInDays > 1) {
            await   collect({interval: '1day'},   Date.now() - oneDay * 2)
        }

        await       collect({interval: '5min'},   Date.now()) 
        return { symbol, data};
    }

}

interface StockPing {
    symbol: string
    nextPingTime: number
}

export class StockModel
{
    stockProvider: IStockProvider
    cache: ICache;
    private _reportStateChange: (state: StockData) => void = ()=>{}
    private _pingList: StockPing[] = []
    private _pingInterval_ms = 60 * 1000 * 10 // 10 minutes
    logger: ILogger
    private _collectingCount = 0;



    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: ILogger, provider: IStockProvider, cache: ICache, reportStateChange: (state: StockData) => void) {
        this.stockProvider = provider;
        this.cache = cache;
        this.logger = logger;
        this._reportStateChange = reportStateChange;

        const handlePings = async() => {
            for(let item of this._pingList) {
                if(Date.now() > item.nextPingTime) {
                    await this.getData(item.symbol, false);
                    // set the ping time in the future plus some jitter
                    item.nextPingTime = Date.now() + this._pingInterval_ms + Math.floor( Math.random() * 60000);
                    break;
                }
            }
            setTimeout(handlePings, 10000)
        }

        handlePings();
    }

    //------------------------------------------------------------------------------------------
    // getData
    //------------------------------------------------------------------------------------------
    async getData(symbol: string, reportIfCached: boolean = true) {
        symbol = symbol.toUpperCase();
        if(!this._pingList.find(i => i.symbol === symbol)) {
            this.logger.logLine(`New Stock: ${symbol}`)
            this._pingList.push({symbol, nextPingTime: Date.now() + this._pingInterval_ms});
        }
        const cachedDataJson = (await this.cache.getItem(symbol))?.data;
        let cachedData = cachedDataJson 
            ? JSON.parse(cachedDataJson ?? "") as StockData
            : undefined;

        let reported = false;
        // Maybe report immediately if there is something cached
        if(cachedData && (reportIfCached || this._collectingCount > 3)) {
            this._reportStateChange(cachedData)
            reported = true;
        }

        // Just report what's in the cache if it has been less than 5 min
        if(cachedData) {
            const now = new Date();
            const timeSinceLastCheck = (now.valueOf() - cachedData.data[0].date * 1000)
            const est = estNow();
            const outsideTradingHours = 
                   now.getDay() === 0 
                || now.getDay() === 6
                || est.hour < 9
                || est.hour > 17

            if(timeSinceLastCheck < this._pingInterval_ms || outsideTradingHours) {
                this.logger.logLine(`Reporting cached data for ${symbol} (${timeSinceLastCheck < this._pingInterval_ms} ${outsideTradingHours})`)
                if(!reported) 
                {
                    this._reportStateChange(cachedData)
                }
                return;
            }
        }

        if(this._collectingCount > 5)
        {
            console.log("WEIRD: collectingCount was bigger than 5")
            this._collectingCount = 4;
        }

        if(this._collectingCount > 3) {
            this.logger.logLine("WARNING:  Missing a new collection because count was high")
            return;
        }
        this._collectingCount++;

        // let's load some fresh data
        const freshData = await this.stockProvider.getData(symbol, cachedData?.data ?? [])
        this._collectingCount--;
        if(this._collectingCount < 0)
        {
            console.log("WEIRD: collectingCount was below zero")
            this._collectingCount = 0;
        }

        const stockDataPoints = freshData.data;
        stockDataPoints.sort((a,b) => b.date - a.date)
        let timeSpot = stockDataPoints[0].date;
        let timeDelta = 300;  // five minutes

        // chop up the data into exponentially increasing time segments
        const prunedPoints = stockDataPoints.filter(p => {
            if(p.date <= timeSpot) {
                timeDelta *= 1.05; // get exponentially longer time segments
                timeSpot = p.date - timeDelta;
                return true;
            }
            else return false;
        })
        freshData.data = prunedPoints;
        this.logger.logLine(`Returning ${freshData.data.length} points for ${symbol}`)

        this._reportStateChange(freshData)
        await this.cache.storeItem(symbol, JSON.stringify(freshData))
    }
}