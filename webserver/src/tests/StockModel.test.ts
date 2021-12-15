import { expect } from "chai";
import { StockModel } from "../models/StockModel";



describe('StockModel.getCacheResponse', async () => {

    const assert = (date: Date, lastTime: number, qsize: number, reportFromCache: boolean, reason: string) =>
    {
        const result = StockModel.getCacheResponse(date, lastTime, qsize, 1000);
        expect(result).deep.equal({reportFromCache, reason})
    }

    it('should cache when queue is full', async () => {
        const now = new Date(Date.parse("2021/11/17 12:00:00 GMT-0800"))
        assert(now, 0, 0, false, "")
        assert(now, 0, 3, false, "")
        assert(now, 0, 4, true, "Request queue is full")
    });
    
    it('should cache when data is fresh', async () => {
        const now = new Date(Date.parse("2021/11/17 12:00:00 GMT-0800"))
        assert(now, now.valueOf(),      0,  true, "Data is fresh")
        assert(now, now.valueOf()-999,  0,  true, "Data is fresh")
        assert(now, now.valueOf()-1000, 0,  false, "")
    });
    
    it('should cache when outside of trading hours', async () => {
        assert(new Date(Date.parse("2021/11/17 14:59:01 GMT-0700")), 0, 0,  false, "")
        assert(new Date(Date.parse("2021/11/17 15:00:02 GMT-0700")), 0, 0,  true, "Outside of trading hours")
        assert(new Date(Date.parse("2021/11/17 07:00:03 GMT-0700")), 0, 0,  false, "")
        assert(new Date(Date.parse("2021/11/17 06:59:04 GMT-0700")), 0, 0,  true, "Outside of trading hours")

        // Sat/Sun not in trading hours
        assert(new Date(Date.parse("2021/11/13 12:00:05 GMT-0700")), 0, 0,  true, "Outside of trading hours")
        assert(new Date(Date.parse("2021/11/14 12:00:06 GMT-0700")), 0, 0,  true, "Outside of trading hours")
    });

});
