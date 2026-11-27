import { HealthResult } from "./HealthProbe";

export interface HealthMonitorOptions {
    /** Poll this often until the server first answers */
    startupPollMs: number
    /** Poll this often once it is up */
    intervalMs: number
    /** How long a fresh server gets to come up before silence counts as a hang */
    startupGraceMs: number
    /** Consecutive failed checks that mean "hung" */
    maxFailures: number
}

export interface HealthMonitorEvents {
    onHealthy: (version: string) => void
    onHung: (reason: string) => void
}

// ---------------------------------------------------------------------------------
// Watches a running server.  A process that is alive but no longer answering is
// as broken as one that crashed, so after several missed checks we report it
// as hung and the supervisor restarts it.
// ---------------------------------------------------------------------------------
export class HealthMonitor {
    static readonly defaults: HealthMonitorOptions = {
        startupPollMs: 1000,
        intervalMs: 30 * 1000,
        startupGraceMs: 120 * 1000,
        maxFailures: 3,
    }

    private timer?: NodeJS.Timeout;
    private running = false;
    readonly options: HealthMonitorOptions;

    constructor(private probe: () => Promise<HealthResult>, options: Partial<HealthMonitorOptions> = {}) {
        this.options = { ...HealthMonitor.defaults, ...options };
    }

    start(events: HealthMonitorEvents) {
        this.stop();
        this.running = true;
        const startedAt = Date.now();
        let healthy = false;
        let failures = 0;

        const tick = async () => {
            if (!this.running) return;
            const result = await this.probe();
            if (!this.running) return;

            if (result.ok) {
                failures = 0;
                if (!healthy) {
                    healthy = true;
                    events.onHealthy(result.version ?? "unknown");
                }
            } else if (healthy) {
                failures++;
                if (failures >= this.options.maxFailures) {
                    this.stop();
                    events.onHung(`server stopped responding (${failures} failed health checks: ${result.error})`);
                    return;
                }
            } else if (Date.now() - startedAt > this.options.startupGraceMs) {
                this.stop();
                events.onHung(`server did not respond within ${Math.round(this.options.startupGraceMs / 1000)}s of starting (${result.error})`);
                return;
            }
            this.timer = setTimeout(tick, healthy ? this.options.intervalMs : this.options.startupPollMs);
        }
        this.timer = setTimeout(tick, this.options.startupPollMs);
    }

    stop() {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }
}
