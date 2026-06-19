import { expect } from "chai";
import { PingModel } from "../models/PingModel";
import { ILogger } from "../helpers/logger";

class SilentLogger implements ILogger {
    logLine(_text: string) {}
    logError(_text: string) {}
}

// Note: constructing PingModel starts a 1s self-rescheduling worker. With an
// empty/future ping list it never makes a network call during a fast test run,
// and mocha's `exit: true` tears down the dangling timer.
const makeModel = () => new PingModel(new SilentLogger(), () => {});

describe("PingModel.handlePing", () => {
    it("registers a new ping task and schedules it to run immediately", () => {
        const model = makeModel();
        model.handlePing({ id: 1, url: "http://example.com" });
        expect(model.pings.length).equal(1);
        expect(model.pings[0].command.url).equal("http://example.com");
        expect(model.pings[0].nextPingTime).equal(0);
    });

    it("updates the existing task in place when the same id pings again", () => {
        const model = makeModel();
        model.handlePing({ id: 1, url: "http://old.com" });
        model.handlePing({ id: 1, url: "http://new.com", regex: "ok" });
        expect(model.pings.length).equal(1);
        expect(model.pings[0].command.url).equal("http://new.com");
        expect(model.pings[0].command.regex).equal("ok");
    });

    it("tracks distinct ids as separate tasks", () => {
        const model = makeModel();
        model.handlePing({ id: 1, url: "http://a.com" });
        model.handlePing({ id: 2, url: "http://b.com" });
        expect(model.pings.map(p => p.command.id)).deep.equal([1, 2]);
    });

    it("sets idle and termination windows in the future", () => {
        const model = makeModel();
        const before = Date.now();
        model.handlePing({ id: 1, url: "http://a.com" });
        const task = model.pings[0];
        expect(task.idleTime).greaterThan(before);
        expect(task.terminationTime).greaterThan(task.idleTime);
    });
});
