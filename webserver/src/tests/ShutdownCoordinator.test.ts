import { expect } from "chai";
import { EventEmitter } from "events";
import { HompagExitCode } from "hompag-common";
import { ShutdownCoordinator } from "../helpers/ShutdownCoordinator";
import { MockLogger } from "./testHelpers";

describe('ShutdownCoordinator', () => {

    const setup = (flush: () => Promise<void> = async () => {}, flushTimeoutMs = 1000) => {
        const exits: number[] = [];
        const logger = new MockLogger();
        const target = new ShutdownCoordinator(logger, flush, (code) => exits.push(code), flushTimeoutMs);
        return { target, exits, logger };
    }

    it('flushes and then exits cleanly', async () => {
        const events: string[] = [];
        const { target, exits } = setup(async () => { events.push("flush") });
        await target.shutdown("test", HompagExitCode.Clean);
        expect(events).deep.equal(["flush"]);
        expect(exits).deep.equal([HompagExitCode.Clean]);
    });

    it('only shuts down once', async () => {
        let flushes = 0;
        const { target, exits } = setup(async () => { flushes++ });
        await Promise.all([
            target.shutdown("first", HompagExitCode.Clean),
            target.shutdown("second", HompagExitCode.Crash)
        ]);
        expect(flushes).equal(1);
        expect(exits).deep.equal([HompagExitCode.Clean]);
    });

    it('still exits when the flush fails', async () => {
        const { target, exits, logger } = setup(async () => { throw new Error("disk gone") });
        await target.shutdown("test", HompagExitCode.Clean);
        expect(exits).deep.equal([HompagExitCode.Clean]);
        expect(logger.errorText).contains("disk gone");
    });

    it('still exits when the flush hangs', async () => {
        const { target, exits, logger } = setup(() => new Promise<void>(() => {}), 20);
        await target.shutdown("test", HompagExitCode.Clean);
        expect(exits).deep.equal([HompagExitCode.Clean]);
        expect(logger.errorText).contains("longer than 20ms");
    });

    it('logs the stack and exits with the crash code on unhandled errors', async () => {
        const { target, exits, logger } = setup();
        await target.crash("Uncaught exception", new Error("kaboom"));
        expect(exits).deep.equal([HompagExitCode.Crash]);
        expect(logger.errorText).contains("kaboom");
    });

    it('responds to a supervisor shutdown message', async () => {
        const { target, exits } = setup();
        const fakeProcess = new EventEmitter();
        target.install(fakeProcess as unknown as NodeJS.Process);
        fakeProcess.emit('message', { cmd: 'something else' });
        expect(target.isShuttingDown).equal(false);
        fakeProcess.emit('message', { cmd: 'shutdown' });
        await new Promise(resolve => setImmediate(resolve));
        expect(exits).deep.equal([HompagExitCode.Clean]);
    });

    it('shuts down when the supervisor connection drops', async () => {
        const { target, exits } = setup();
        const fakeProcess = new EventEmitter();
        target.install(fakeProcess as unknown as NodeJS.Process);
        fakeProcess.emit('disconnect');
        await new Promise(resolve => setImmediate(resolve));
        expect(exits).deep.equal([HompagExitCode.Clean]);
    });

    it('treats unhandled rejections as crashes', async () => {
        const { target, exits } = setup();
        const fakeProcess = new EventEmitter();
        target.install(fakeProcess as unknown as NodeJS.Process);
        fakeProcess.emit('unhandledRejection', "nope");
        await new Promise(resolve => setImmediate(resolve));
        expect(exits).deep.equal([HompagExitCode.Crash]);
    });
});
