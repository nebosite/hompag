export interface StockDetail {
    date: number,
    values: number[],
}

export interface StockData {
    symbol: string,
    data: StockDetail[]
}
