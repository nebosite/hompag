import { HompagExitCode } from "hompag-common";

export interface CrashPolicyOptions {
    /** Give up after this many crashes ... */
    maxCrashes: number
    /** ... within this window */
    windowMs: number
    /** A run this long is considered healthy and clears the crash history */
    healthyResetMs: number
    /** First restart delay; doubles with each crash */
    baseDelayMs: number
    /** Cap on the restart delay */
    maxDelayMs: number
}

export type ExitDecision =
    | { action: "stop", reason: string }
    | { action: "restart", delayMs: number, reason: string }
    | { action: "giveUp", reason: string }
    | { action: "portInUse", reason: string }

// ---------------------------------------------------------------------------------
// Decides what the supervisor does when the server exits.  Pure logic: time is
// passed in, so this is easy to test.
// ---------------------------------------------------------------------------------
export class CrashPolicy {
    static readonly defaults: CrashPolicyOptions = {
        maxCrashes: 5,
        windowMs: 15 * 60 * 1000,
        healthyResetMs: 10 * 60 * 1000,
        baseDelayMs: 1000,
        maxDelayMs: 30 * 1000,
    }

    private crashTimes: number[] = [];
    readonly options: CrashPolicyOptions;

    constructor(options: Partial<CrashPolicyOptions> = {}) {
        this.options = { ...CrashPolicy.defaults, ...options };
    }

    /** Times of the crashes that currently count against the limit */
    get recentCrashes(): readonly number[] { return this.crashTimes; }

    // ---------------------------------------------------------------------------------
    // Forget past crashes (e.g. the user pressed Restart)
    // ---------------------------------------------------------------------------------
    reset() {
        this.crashTimes = [];
    }

    // ---------------------------------------------------------------------------------
    // The server exited.  code is null when it was killed by a signal (or by us,
    // because it hung).  uptimeMs is how long that run lasted.
    // ---------------------------------------------------------------------------------
    onExit(code: number | null, now: number, uptimeMs: number, why?: string): ExitDecision {
        switch (code) {
            case HompagExitCode.Clean:
                return { action: "stop", reason: "server stopped normally" };
            case HompagExitCode.RestartRequested:
                return { action: "restart", delayMs: 0, reason: "server requested a restart" };
            case HompagExitCode.ConfigError:
                return { action: "giveUp", reason: "the server configuration is invalid (see log)" };
            case HompagExitCode.PortInUse:
                return { action: "portInUse", reason: "the port is already in use" };
        }

        const description = why ?? (code === null ? "server was killed" : `server crashed with exit code ${code}`);

        if (uptimeMs >= this.options.healthyResetMs) this.crashTimes = [];
        this.crashTimes.push(now);
        this.crashTimes = this.crashTimes.filter(t => now - t < this.options.windowMs);

        const count = this.crashTimes.length;
        if (count >= this.options.maxCrashes) {
            const minutes = Math.round(this.options.windowMs / 60000);
            return { action: "giveUp", reason: `${description}; ${count} crashes in ${minutes} minutes, giving up` };
        }

        const delayMs = Math.min(this.options.baseDelayMs * 2 ** (count - 1), this.options.maxDelayMs);
        return { action: "restart", delayMs, reason: `${description} (crash ${count} of ${this.options.maxCrashes})` };
    }
}
