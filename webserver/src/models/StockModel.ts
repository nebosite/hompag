import { ILogger } from "../helpers/logger";

var axios = require("axios").default;


export interface StockDetail {
        date: number,
        open: number,
        high: number,
        low: number,
        close: number,
        volume: number
    }

export interface StockData {
    symbol: string,
    data: StockDetail[]
}

export interface IStockProvider{

    getData(symbol: string): Promise<StockData>


}

export interface AxiosConfig {
    apiKey: string
}

export class AxiosStockProvder implements IStockProvider {

    apiKey?: string;
    logger: ILogger

    constructor(config: AxiosConfig,logger: ILogger) {
        this.apiKey = config?.apiKey
        this.logger = logger
    }

    getData = async (symbol: string): Promise<StockData> => {
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


        const data:StockDetail[] = []

        const pushSamples = (seriesData: any) => {
            for(const dateValue in seriesData ) {
                data.push(
                    {
                        date:   Date.parse(dateValue),
                        open:   seriesData[dateValue]["1. open"],
                        high:   seriesData[dateValue]["2. high"],
                        low:    seriesData[dateValue]["3. low"],
                        close:  seriesData[dateValue]["4. close"],
                        volume: seriesData[dateValue]["5. volume"],
                    }
                )
            }
        }

        const logger = this.logger;

        const collect = async (params:any, seriesName: string) => {
            const options:any = makeOptions(params)

            await axios.request(options).then(function (response:any) {
                const series = response.data[seriesName]
                if(!series) {
                    console.log(`No Series for ${seriesName}`)
                    for(const item in response.data) {
                        console.log(`    Property: ${item}`)
                    }
                }
                pushSamples(series)
            }).catch(function (error: any) {
                logger.logError(`Stock error: ${error}`)
                console.error(error);
            });

        }

        await collect({function: 'TIME_SERIES_INTRADAY', interval: '5min'},   "Time Series (5min)")
        await collect({function: 'TIME_SERIES_DAILY'},                        "Time Series (Daily)")
        await collect({function: 'TIME_SERIES_MONTHLY'},                      "Monthly Time Series")

        data.sort((a,b) => b.date - a.date)
        return { symbol, data};
    }

}


export class StockModel
{
    stockProvider: IStockProvider

    constructor(provider: IStockProvider) {
        this.stockProvider = provider;
    }

    getData(symbol: string) {
        return this.stockProvider.getData(symbol)
    }

}