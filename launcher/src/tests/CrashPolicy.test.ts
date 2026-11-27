import { expect } from "chai";
import { HompagExitCode } from "hompag-common";
import { CrashPolicy } from "../CrashPolicy";

const MINUTE = 60 * 1000;

describe("CrashPolicy", () => {
    it("does not restart after a clean exit", () => {
        const target = new CrashPolicy();
        expect(target.onExit(HompagExitCode.Clean, 0, 1000).action).equal("stop");
    });

    it("restarts immediately when the server asks for it", () => {
        const decision = new CrashPolicy().onExit(HompagExitCode.RestartRequested, 0, 1000);
        expect(decision).deep.include({ action: "restart", delayMs: 0 });
    });

    it("gives up immediately on a config error, since restarting can't help", () => {
        expect(new CrashPolicy().onExit(HompagExitCode.ConfigError, 0, 1000).action).equal("giveUp");
    });

    it("reports port conflicts separately", () => {
        expect(new CrashPolicy().onExit(HompagExitCode.PortInUse, 0, 1000).action).equal("portInUse");
    });

    it("backs off exponentially, capped at the maximum delay", () => {
        const target = new CrashPolicy({ maxCrashes: 100, baseDelayMs: 1000, maxDelayMs: 10000 });
        const delays = [];
        for (let i = 0; i < 6; i++) {
            const decision = target.onExit(1, i * 1000, 500);
            if (decision.action !== "restart") throw Error("expected restart");
            delays.push(decision.delayMs);
        }
        expect(delays).deep.equal([1000, 2000, 4000, 8000, 10000, 10000]);
    });

    it("gives up after too many crashes inside the window", () => {
        const target = new CrashPolicy({ maxCrashes: 5, windowMs: 15 * MINUTE });
        const actions = [];
        for (let i = 0; i < 5; i++) actions.push(target.onExit(1, i * MINUTE, 1000).action);
        expect(actions).deep.equal(["restart", "restart", "restart", "restart", "giveUp"]);
    });

    it("forgets crashes that fall outside the window", () => {
        const target = new CrashPolicy({ maxCrashes: 3, windowMs: 10 * MINUTE });
        target.onExit(1, 0, 1000);
        target.onExit(1, 1 * MINUTE, 1000);
        // 11 minutes later the first two are outside the window
        const decision = target.onExit(1, 12 * MINUTE, 1000);
        expect(decision.action).equal("restart");
        expect(target.recentCrashes.length).equal(1);
    });

    it("clears the history after a long healthy run", () => {
        const target = new CrashPolicy({ maxCrashes: 3, healthyResetMs: 10 * MINUTE, windowMs: 60 * MINUTE });
        target.onExit(1, 0, 1000);
        target.onExit(1, 1 * MINUTE, 1000);
        const decision = target.onExit(1, 20 * MINUTE, 15 * MINUTE);
        expect(decision).deep.include({ action: "restart", delayMs: 1000 });
    });

    it("treats a kill (null exit code) as a crash and keeps the given reason", () => {
        const decision = new CrashPolicy().onExit(null, 0, 1000, "server stopped responding");
        expect(decision.action).equal("restart");
        expect(decision.reason).contains("server stopped responding");
    });

    it("starts fresh after reset", () => {
        const target = new CrashPolicy({ maxCrashes: 2 });
        target.onExit(1, 0, 1000);
        target.reset();
        expect(target.onExit(1, 1000, 1000).action).equal("restart");
    });
});
