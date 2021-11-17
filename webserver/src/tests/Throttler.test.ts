import { expect } from "chai";
import { Throttler } from "../helpers/Throttler";



describe('Throttler.runThrottled', async () => {
    it('pauses when request per minute has gone too high', async () => {
        const target = new Throttler(3);
        let doNothingCalls:number[] = [];
        let actionCallCount = 0;
        let now = 1000000000000
        target.doNothing = async (d) => {doNothingCalls.push(d)}
        target.getTime = () => now;
        const action = async() => {
            actionCallCount++;
        }

        await target.runThrottled(action);
        expect(actionCallCount).equal(1);
        expect(doNothingCalls).deep.equal([])

        await target.runThrottled(action);
        await target.runThrottled(action);
        await target.runThrottled(action);
        expect(actionCallCount).equal(4);
        expect(doNothingCalls).deep.equal([60000])
    });
    
    it('pauses just long enough to go below rate limit', async () => {
        const target = new Throttler(2);
        let doNothingCalls:number[] = [];
        let actionCallCount = 0;
        let now = 1000000000000
        target.doNothing = async (d) => {doNothingCalls.push(d)}
        target.getTime = () => now;
        const action = async() => {
            actionCallCount++;
        }

        await target.runThrottled(action);
        expect(actionCallCount).equal(1);
        expect(doNothingCalls).deep.equal([])

        now += 30000
        await target.runThrottled(action);
        expect(actionCallCount).equal(2);
        expect(doNothingCalls).deep.equal([])

        now += 10000
        await target.runThrottled(action);
        expect(actionCallCount).equal(3);
        expect(doNothingCalls).deep.equal([20000])

        // this should put us back to fresh
        now += 60000
        await target.runThrottled(action);
        await target.runThrottled(action);
        await target.runThrottled(action);
        expect(actionCallCount).equal(6);
        expect(doNothingCalls).deep.equal([20000, 60000])
    });
 
});
