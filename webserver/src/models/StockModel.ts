import { StockDetail, StockData, RandomHelper } from "hompag-common";
import { ILogger, LoggerPrefixer } from "../helpers/logger";
import { Throttler } from "../helpers/Throttler";
import { ICache } from "./ServerModel";

import * as axios_lib from "axios"
const axios = axios_lib.default;

//--------------------------------------------------------------------------------------
// Get current hour in eastern standard time
//--------------------------------------------------------------------------------------
function estHour(date: Date) {
    const dateString = date.toLocaleString("en-US", {timeZone: "America/New_York", hour12: false});   
    const hourMatch = dateString.match(/, (\d+):/)
    if(!hourMatch) {
        console.log(`BAD TIME: ${dateString}`)
        return 0;
    }
    const hourText = hourMatch[1]
    const hour = Number.parseInt(hourText)
    return hour
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
    throttler = new Throttler(8)

    constructor(config: AxiosConfig, logger: ILogger) {
        this.apiKey = config?.apiKey
        this.logger = logger
    }

    getData = async (symbol: string, data: StockDetail[]): Promise<StockData> => {
        if(!symbol) {
            throw Error("StockModel.getData: no symbol provided")
        }
        if(!this.apiKey) throw Error("No Axios API provided in config")

        // for a set of samples, push them into an existing set of data
        // only include samples older than what is already in the set and
        // younger than the cutoff.
        const pushSamples = (seriesData: any[], cutoffTimeStamp: number) => {
            let oldestTimeStamp = data.length 
                ? data.map(i => i.date).reduce((p,c) => Math.max(p,c)) * 1000
                : 0;
            for(const item of seriesData ) {
                const date = Date.parse(item.datetime + " EST");
                if(date > cutoffTimeStamp) continue;
                if(date <= oldestTimeStamp) continue;
                oldestTimeStamp = date;
                const close = Number.parseFloat(item.close);
                const open = Number.parseFloat(item.open);
                const low = Number.parseFloat(item.low);
                const high = Number.parseFloat(item.high);
                const volume = Number.parseFloat(item.volume); 
                const pushMe = {
                        date:   date/1000,
                        values: [
                            Math.floor(close * 100)/100,
                            Math.floor(low * 100)/100,
                            Math.floor(high * 100)/100,
                            Number.parseFloat((volume / 1000000).toFixed(2)),
                            Math.floor(open * 100)/100,
                        ]
                    }
                data.push(pushMe)
            }
        }

        const collect = async (interval: '1week' | '1day' | '1hour' | '15min', cutoffTimeStamp: number) => {
            // Call axious to get the last 200 data points at the specified interval
            // exclude data after the cutoff
            const options:any = {
                    method: 'GET',
                    url: 'https://twelve-data1.p.rapidapi.com/time_series',
                    params: {
                        symbol,
                        format: 'json',
                        outputsize: '200', // how many samples to go back in time
                        interval
                    },
                    headers: {
                        'x-rapidapi-host': 'twelve-data1.p.rapidapi.com',
                        'x-rapidapi-key': this.apiKey
                    }
                }

            let stockResponse:any;
            await this.throttler.runThrottled(async ()=> {
                this.logger.logLine(`Collecting axios data for ${symbol}:${options.params.interval} ${(Date.now() - cutoffTimeStamp) / ONE_HOUR}`)
                stockResponse = await axios.request(options)
                    .catch((err: any) => {
                        if(`${err}`.indexOf("code 429") > -1)
                        {
                            this.logger.logError(`Exceeded axios quota. ${symbol}`)
                        }
                        else
                        {
                            this.logger.logError(`Failed on stock query: ${err}`) 
                        }
                        return undefined;
                    })
            })

            const series = stockResponse?.data?.values
            if(series) {
                pushSamples(series, cutoffTimeStamp) 
            }
        }

        const oneDay = 24 * 3600 * 1000;

        // If we haven't taken data yet, let's get a long history
        // at one month intervals
        if(data.length === 0) {
            await collect('1week', Date.now() - oneDay * 90 )
        }

        const collectSegment = async (interval: '1week' | '1day' | '1hour' | '15min' , dayBoundary: number) => {
            const newest = data.length 
                ? data.map(i => i.date).reduce((p,c) => Math.max(p,c)) * 1000
                : 0;
            const ageInDays = (Date.now() - newest) / (ONE_HOUR * 24);

            if(ageInDays > dayBoundary) {
                await collect(interval,  Date.now() - oneDay * dayBoundary)
            } 
    
        }

        // Make sure we have the full tale of data
        await collectSegment('1day', 14);
        await collectSegment('1hour', 3);
        await collectSegment('15min', 0);

        return { symbol, data};
    }

}

interface StockPing {
    symbol: string;
    nextPingTime: number;
    lastRequestTime: number;
    errorState?: string;
    errorCount: number;
    firstTime: boolean;
}

const ONE_HOUR = 3600000;
const ONE_MINUTE = 60000;
export class StockModel
{
    stockProvider: IStockProvider
    cache: ICache;
    private _reportStateChange: (state: StockData) => void = ()=>{}
    private _pingList: StockPing[] = []
    private _checkInterval_ms = 1000; // every second
    private _minUpdateInterval_ms = ONE_HOUR * 2;
    logger: ILogger
    private _collectingCount = 0;
    private _rand = new RandomHelper();

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: ILogger, provider: IStockProvider, cache: ICache, reportStateChange: (state: StockData) => void) {
        this.stockProvider = provider;
        this.cache = cache;
        this.logger = new LoggerPrefixer(logger, "Stock");
        this._reportStateChange = reportStateChange;

        const handlePings = async() => {
            for(let item of [...this._pingList]) {

                const ageInHours = (Date.now() - item.lastRequestTime)/ONE_HOUR;
                // If no pages have asked for this stock in 12 hours,
                // stop trying to keep it up to date
                if(ageInHours > 12) {
                    const index = this._pingList.indexOf(item);
                    this._pingList.slice(index,1)
                    continue;
                }

                if(Date.now() > item.nextPingTime) {
                    try {
                        await this.getData(item.symbol);   
                        item.errorCount = 0;
                        item.errorState = undefined;  
                    } catch(err) {
                        item.errorState = `${err}`;
                        item.errorCount++;
                    } finally {
                        switch(item.errorCount) {
                            case 1: 
                                // on the first error, try again quickly
                                item.nextPingTime = Date.now() + ONE_MINUTE * 10; break;
                            case 0:
                            case 2:
                                // Normally, just keep checking at the interval rate
                                const jitter = (0.95 + this._rand.float(0.1));
                                item.nextPingTime = Date.now() + this._minUpdateInterval_ms * jitter;
                                break;
                            default: 
                                // When there are lots of errors, just wait a day
                                item.nextPingTime = Date.now() + 24 * ONE_HOUR;
                                break;
                        }

                    }
                }
            }
            setTimeout(handlePings, this._checkInterval_ms)
        }

        handlePings();
    }

    //------------------------------------------------------------------------------------------
    // Figure out if it is appropriate to request new data or just serve from the cache
    //------------------------------------------------------------------------------------------
    static getCacheResponse(now: Date, timeOfLastDataPoint: number, queueSize: number, interval_ms: number) {
        const queueIsFull = queueSize > 10;
        const dataIsFresh = (now.valueOf() - timeOfLastDataPoint) < interval_ms; 
        const est = estHour(now);
        const outsideTradingHours =  
               now.getDay() === 0 
            || now.getDay() === 6 
            || est <= 8
            || est >= 17

        const shouldReportFromCache = queueIsFull || dataIsFresh || outsideTradingHours;
        return {
            shouldReportFromCache,
            reason: shouldReportFromCache
                ? queueIsFull
                    ? "Request queue is full"
                    : dataIsFresh
                        ? "Data is fresh"
                        : "Outside of trading hours"
                : ""
        }
    }

    firstPingTime = Date.now();

    //------------------------------------------------------------------------------------------
    // getData
    //------------------------------------------------------------------------------------------
    async getData(symbol: string) {
        symbol = symbol.toUpperCase();

        const cachedDataJson = (await this.cache.getItem(symbol))?.data;
        let cachedData = cachedDataJson 
            ? JSON.parse(cachedDataJson ?? "") as StockData
            : undefined;

        const lastDataPointTime = (cachedData ? cachedData.data[0].date * 1000 : 0)
        const cacheResponse = StockModel.getCacheResponse(new Date(), lastDataPointTime, this._collectingCount, this._checkInterval_ms)

        // Remember any symbols we haven't see before
        const foundPing = this._pingList.find(i => i.symbol === symbol);
        if(!foundPing) {
            // For stocks we haven't seen yet, get the data immediately
            this.logger.logLine(`New Stock: ${symbol}`);
            if(Date.now() > this.firstPingTime) {
                this.firstPingTime = Date.now();
            }

            this.firstPingTime += 2000 + this._rand.int(2000);
            
            this._pingList.push({
                symbol, 
                nextPingTime: this.firstPingTime, 
                lastRequestTime: Date.now(),
                errorCount: 0,
                firstTime: true
            });

            if(cachedData) {
                this._reportStateChange(cachedData!)
            }
            
            return;
        } 
            
        foundPing.lastRequestTime = Date.now();
        if(foundPing.nextPingTime > Date.now()) return;

        // always try to get from the api on the first time
        if(!foundPing.firstTime) {
            // report cache if we need to wait to hit the API again
            // or if the there is some reason not to get new data
            if(foundPing.nextPingTime > Date.now()
                || cacheResponse.shouldReportFromCache)
            {
                this._reportStateChange(cachedData!)
                this.logger.logLine(`Reporting cached data for ${symbol} because ${cacheResponse.reason}`)
                return;
            }
        }

        foundPing.firstTime = false;

        this._collectingCount++;
        this.logger.logLine(`Queue count: ${this._collectingCount}`)
        let freshData: StockData | undefined = undefined;
        try {
            freshData = await this.stockProvider.getData(symbol, cachedData?.data ?? [])
        } finally {
            this._collectingCount--;
        }
        // let's load some fresh data
        if(this._collectingCount < 0)
        {
            console.log("WEIRD: collectingCount was below zero")
        }

        const stockDataPoints = freshData.data;
        stockDataPoints.sort((a,b) => b.date - a.date)
        let timeSpot = stockDataPoints[0].date;
        let timeDelta = 900;  // 15 minutes

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