import { StockDetail, StockData } from "hompag-common";
import { doNothing } from "../helpers/asyncHelper";
import { ILogger } from "../helpers/logger";
import { ICache } from "./ServerModel";

var axios = require("axios").default;



export interface IStockProvider{
    getData(symbol: string, cachedData: StockDetail[]): Promise<StockData>
}

export interface AxiosConfig {
    apiKey: string
}

export class AxiosStockProvder implements IStockProvider {

    apiKey?: string;
    logger: ILogger

    constructor(config: AxiosConfig, logger: ILogger) {
        this.apiKey = config?.apiKey
        this.logger = logger
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
                url: 'https://alpha-vantage.p.rapidapi.com/query',
                params: {
                    symbol,
                    datatype: 'json',
                    output_size: 'compact',
                    ...params
                },
                headers: {
                    'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
                    'x-rapidapi-key': this.apiKey
                }
            }
        }


        const pushSamples = (seriesData: any) => {
            for(const dateValue in seriesData ) {
                const item = seriesData[dateValue]
                const close = Number.parseFloat(item["4. close"]);
                const low = Number.parseFloat(item["3. low"]);
                const high = Number.parseFloat(item["2. high"]);
                const volume = Number.parseFloat(item["5. volume"]);
                data.push(
                    {
                        date:   Date.parse(dateValue)/1000,
                        values: [
                            Math.floor(close * 100)/100,
                            Math.floor(low * 100)/100,
                            Math.floor(high * 100)/100,
                            Number.parseFloat((volume / 1000000).toFixed(2))
                        ]
                    }
                )
            }
        }

        const logger = this.logger;

        const collect = async (params:any, seriesName: string) => {

            const options:any = makeOptions(params)
            if(!options.params.symbol) {
                logger.logError(`ERROR: no symbol defined: ${JSON.stringify(options)}`)
                return;
            }
            this.logger.logLine(`Collecting axios data for ${symbol}:${options.params.function} `)

            while(true) {
                const stockResponse = await axios.request(options)
                    .catch((err: any) => {
                        if(`${err}`.indexOf("code 429") === -1)
                        {
                            logger.logError(`Failed on stock query: ${err}`) 
                        }
                        return undefined;
                    })
                const series = stockResponse?.data[seriesName]
                if(series) {
                    pushSamples(series)
                    break;
                }
                await doNothing(60000);
            }
        }

        if(data.length === 0) {
            await collect({function: 'TIME_SERIES_MONTHLY'},                      "Monthly Time Series")
        }
        const newest = data.length 
            ? data.map(i => i.date).reduce((p,c) => Math.max(p,c)) * 1000
            : 0;
        const ageInDays = (Date.now() - newest) / (24 * 3600 * 1000);
        if(ageInDays > 1) {
            await collect({function: 'TIME_SERIES_DAILY'},                        "Time Series (Daily)")
        }

        await collect({function: 'TIME_SERIES_INTRADAY', interval: '5min'},   "Time Series (5min)") 
        return { symbol, data};
    }

}


export class StockModel
{
    stockProvider: IStockProvider
    cache: ICache;
    private _reportStateChange: (state: StockData) => void = ()=>{}
    private _pingList: string[] = []
    logger: ILogger

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: ILogger, provider: IStockProvider, cache: ICache, reportStateChange: (state: StockData) => void) {
        this.stockProvider = provider;
        this.cache = cache;
        this.logger = logger;
        this._reportStateChange = reportStateChange;

        const handlePings = async() => {
            for(let symbol of this._pingList) {
                await this.getData(symbol, false);
            }
            setTimeout(handlePings, 5 * 60000)
        }

        handlePings();
    }

    //------------------------------------------------------------------------------------------
    // getData
    //------------------------------------------------------------------------------------------
    async getData(symbol: string, reportIfCached: boolean = true) {
        symbol = symbol.toUpperCase();
        if(!this._pingList.find(i => i === symbol)) {
            this.logger.logLine(`New Stock: ${symbol}`)
            this._pingList.push(symbol);
        }
        const cachedData = (await this.cache.getItem(symbol))?.data;
        if(cachedData && reportIfCached) {
            this._reportStateChange(JSON.parse(cachedData) as StockData)
        }

        const freshData = await this.stockProvider.getData(symbol, cachedData ? (JSON.parse(cachedData) as StockData).data : [])

        const stockDataPoints = freshData.data;
        stockDataPoints.sort((a,b) => b.date - a.date)
        let timeSpot = stockDataPoints[0].date;
        let timeDelta = 300;  // five minutes

        // chop up the data into exponentially increasing time segments
        const prunedPoints = stockDataPoints.filter(p => {
            if(p.date <= timeSpot) {
                timeDelta *= 1.08; // get exponentiall longer time segments
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