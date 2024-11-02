export interface StockDetail {
    date: number,
    values: number[],  // close, low, high, volume (M), open
}

export interface StockData {
    symbol: string,
    data: StockDetail[]
}
