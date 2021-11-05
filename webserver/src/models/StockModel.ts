import { doNothing } from "../helpers/asyncHelper";
import { ILogger } from "../helpers/logger";
import { ICache } from "./ServerModel";

var axios = require("axios").default;


export interface StockDetail {
        date: number,
        values: number[],
    }

export interface StockData {
    symbol: string,
    data: StockDetail[]
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

    constructor(config: AxiosConfig, logger: ILogger) {
        this.apiKey = config?.apiKey
        this.logger = logger
    }

    getData = async (symbol: string, data: StockDetail[]): Promise<StockData> => {
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
                        date:   Date.parse(dateValue)/100000,
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

            let trying = true;
            while(trying) {
                await axios.request(options).then(function (response:any) {
                    const series = response.data[seriesName]
                    if(!series) {
                        console.log(`No Series for ${seriesName}`)
                        for(const item in response.data) {
                            console.log(`    Property: ${item}`)
                        }
                    }
                    pushSamples(series)
                    trying = false;
                }).catch(function (error: any) {
                    if(`${error}`.indexOf("code 429") === -1)
                    {
                        trying = false;
                        logger.logError(`Failed on stock query: ${error}`)
                    }
                });

            }

            if(trying) await doNothing(60000);
        }

        if(data.length === 0) {
            await collect({function: 'TIME_SERIES_MONTHLY'},                      "Monthly Time Series")
        }
        const newest = data.map(i => i.date).reduce((p,c) => Math.max(p,c)) * 100000
        const ageInDays = (Date.now() - newest) / (24 * 3600 * 1000);
        if(ageInDays > 1) {
            await collect({function: 'TIME_SERIES_DAILY'},                        "Time Series (Daily)")
        }

        await collect({function: 'TIME_SERIES_INTRADAY', interval: '5min'},   "Time Series (5min)")

        data.sort((a,b) => b.date - a.date)
        return { symbol, data};
    }

}


export class StockModel
{
    stockProvider: IStockProvider
    cache: ICache;

    constructor(provider: IStockProvider, cache: ICache) {
        this.stockProvider = provider;
        this.cache = cache;
    }

    async getData(symbol: string) {
        const cachedData = (await this.cache.getItem(symbol))?.data;
        const freshData = await this.stockProvider.getData(symbol, cachedData ? (JSON.parse(cachedData) as StockData).data : [])
        this.cache.storeItem(symbol, JSON.stringify(freshData))
        return freshData
    }

}