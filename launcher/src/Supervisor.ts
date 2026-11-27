import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import { HompagExitCode } from "hompag-common";
import { CrashPolicy, ExitDecision } from "./CrashPolicy";
import { CrashReporter } from "./CrashReporter";
import { FallbackServer } from "./FallbackServer";
import { HealthMonitor, HealthMonitorOptions } from "./HealthMonitor";
import { HealthProbe } from "./HealthProbe";
import { LaunchTarget } from "./LaunchTarget";
import { LogSink } from "./LogSink";
import { SupervisorState, SupervisorStatus } from "./SupervisorStatus";

export interface SupervisorOptions {
    target: LaunchTarget
    port: number
    log: LogSink
    policy?: CrashPolicy
    reporter?: CrashReporter
    notify?: (title: string, message: string) => void
    health?: Partial<HealthMonitorOptions>
    /** Health check request timeout */
    probeTimeoutMs?: number
    /** How long to wait for a graceful stop before killing */
    stopTimeoutMs?: number
    launcherVersion: string
}

// ---------------------------------------------------------------------------------
// Runs the hompag server and keeps it running.
//
//  - The server is started with an IPC channel so it can be asked to shut down
//    gracefully on every OS (Windows has no SIGTERM).
//  - Crashes and hangs are restarted with backoff (see CrashPolicy).  Too many
//    crashes and we stop trying, save a crash report, and wait for the user.
//  - Whenever the server is down, a fallback page answers on its port so the
//    user sees what happened and can restart or report it.
// ---------------------------------------------------------------------------------
export class Supervisor {
    private child?: ChildProcess;
    private childStartedAt = 0;
    private state: SupervisorState = "starting";
    private message = "Getting ready…";
    private restartAt?: number;
    private restartTimer?: NodeJS.Timeout;
    private hungReason?: string;
    private expectedExit?: "restart" | "stop";
    private issueUrl?: string;
    private reportFile?: string;
    private serverVersion?: string;
    /** Last thing the server printed; often explains why it exited */
    private lastServerLine?: string;
    private finished!: () => void;
    readonly done: Promise<void>;

    private readonly policy: CrashPolicy;
    private readonly reporter: CrashReporter;
    private readonly fallback: FallbackServer;
    private readonly monitor: HealthMonitor;
    private readonly probe: HealthProbe;

    constructor(private options: SupervisorOptions) {
        this.policy = options.policy ?? new CrashPolicy();
        this.reporter = options.reporter ?? new CrashReporter();
        this.probe = new HealthProbe(options.port, options.probeTimeoutMs);
        this.monitor = new HealthMonitor(() => this.probe.check(), options.health);
        this.fallback = new FallbackServer({
            status: () => this.status(),
            logTail: () => this.options.log.tail(),
            restart: () => { this.restart("restart requested from the status page").catch(() => {}) },
        });
        this.done = new Promise(resolve => this.finished = resolve);
    }

    private get log() { return this.options.log; }
    private say(text: string) { this.log.write("supervisor", text); }

    status(): SupervisorStatus {
        return {
            state: this.state,
            message: this.message,
            mode: this.options.target.mode,
            port: this.options.port,
            hompagVersion: this.serverVersion ?? this.options.target.version,
            launcherVersion: this.options.launcherVersion,
            supervisorPid: process.pid,
            serverPid: this.child?.pid,
            serverStartedAt: this.child ? this.childStartedAt : undefined,
            restartAt: this.restartAt,
            crashCount: this.policy.recentCrashes.length,
            issueUrl: this.issueUrl,
            reportFile: this.reportFile,
            logFile: this.log.currentFile,
        };
    }

    // ---------------------------------------------------------------------------------
    // Prepare the target (dev: pull + build) and start the server
    // ---------------------------------------------------------------------------------
    async start() {
        const target = this.options.target;
        this.say(`Supervisor ${process.pid} starting hompag ${target.version} (${target.mode} mode) on port ${this.options.port}`);

        if (await this.isOtherHompagRunning()) {
            this.say(`Another hompag server is already answering on port ${this.options.port}. Nothing to do.`);
            this.setState("stopped", "Another hompag server is already running on this port.");
            this.finished();
            return;
        }

        this.setState("starting", target.mode === "dev" ? "Updating and building from source…" : "Starting the server…");
        await this.fallback.start(this.options.port);

        const prepared = await target.prepare(line => this.log.write("build", line)).catch(err => ({
            ok: false, error: (err as Error).message, warning: undefined
        }));
        if (prepared.warning) {
            this.say(`WARNING: ${prepared.warning}`);
            this.options.notify?.("hompag", prepared.warning);
        }
        if (!prepared.ok) {
            this.giveUp(prepared.error ?? "Could not prepare the server");
            return;
        }
        if (this.state === "stopping" || this.state === "stopped") return;
        await this.spawnServer();
    }

    // ---------------------------------------------------------------------------------
    // User asked for a restart: forget past crashes and start fresh
    // ---------------------------------------------------------------------------------
    async restart(why = "restart requested") {
        if (this.state === "stopping" || this.state === "stopped") return;
        this.say(`Restarting: ${why}`);
        this.policy.reset();
        this.issueUrl = undefined;
        this.reportFile = undefined;
        this.clearRestartTimer();
        if (this.child) {
            this.expectedExit = "restart";
            await this.stopChild();
        } else {
            await this.spawnServer();
        }
    }

    // ---------------------------------------------------------------------------------
    // Stop everything and resolve done
    // ---------------------------------------------------------------------------------
    async shutdown(why = "shutdown requested") {
        if (this.state === "stopping" || this.state === "stopped") return;
        this.say(`Shutting down: ${why}`);
        this.setState("stopping", "hompag is shutting down.");
        this.clearRestartTimer();
        this.monitor.stop();
        if (this.child) {
            this.expectedExit = "stop";
            await this.stopChild();
        }
        await this.fallback.stop();
        this.setState("stopped", "hompag is stopped.");
        this.say("Supervisor stopped.");
        this.finished();
    }

    // ---------------------------------------------------------------------------------
    // Start the server process
    // ---------------------------------------------------------------------------------
    private async spawnServer() {
        this.clearRestartTimer();
        await this.fallback.stop();
        this.hungReason = undefined;
        this.lastServerLine = undefined;
        this.expectedExit = undefined;

        const launch = this.options.target.launchCommand();
        this.say(`Starting server: ${launch.command} ${launch.args.join(" ")}`);
        this.setState("starting", "Starting the server…");

        const child = spawn(launch.command, launch.args, {
            cwd: launch.cwd,
            env: { ...launch.env, PORT: String(this.options.port) },
            stdio: ["ignore", "pipe", "pipe", "ipc"],
            windowsHide: true,
        });
        this.child = child;
        this.childStartedAt = Date.now();

        const pipeLines = (stream: NodeJS.ReadableStream | null) => {
            let partial = "";
            stream?.on("data", (chunk: Buffer) => {
                const lines = (partial + chunk.toString()).split(/\r?\n/);
                partial = lines.pop() ?? "";
                for (const line of lines) {
                    this.log.write("server", line);
                    if (line.trim()) this.lastServerLine = line.trim();
                }
            });
            stream?.on("end", () => { if (partial) this.log.write("server", partial); });
        }
        pipeLines(child.stdout);
        pipeLines(child.stderr);

        let exited = false;
        const onExit = (code: number | null, signal: NodeJS.Signals | null, error?: string) => {
            if (exited) return;
            exited = true;
            this.onChildExit(child, code, signal, error).catch(err => this.say(`ERROR handling server exit: ${err}`));
        }
        child.on("error", (err) => onExit(1, null, `could not start the server: ${err.message}`));
        child.on("exit", (code, signal) => onExit(code, signal));

        this.monitor.start({
            onHealthy: (version) => {
                this.serverVersion = version;
                this.say(`Server ${child.pid} is up (version ${version}).`);
                this.setState("running", "hompag is running.");
            },
            onHung: (reason) => {
                this.say(`Server ${child.pid}: ${reason}. Killing it.`);
                this.hungReason = reason;
                child.kill("SIGKILL");
            },
        });
    }

    // ---------------------------------------------------------------------------------
    // The server process ended.  Decide what to do.
    // ---------------------------------------------------------------------------------
    private async onChildExit(child: ChildProcess, code: number | null, signal: NodeJS.Signals | null, error?: string) {
        if (this.child !== child) return;
        this.child = undefined;
        this.monitor.stop();
        const uptime = Date.now() - this.childStartedAt;
        const how = error ?? (signal ? `signal ${signal}` : `exit code ${code}`);
        this.say(`Server ${child.pid} exited after ${Math.round(uptime / 1000)}s (${how}).`);

        const expected = this.expectedExit;
        this.expectedExit = undefined;
        if (expected === "stop") return;
        if (expected === "restart") {
            await this.spawnServer();
            return;
        }

        const decision: ExitDecision = this.policy.onExit(error ? 1 : code, Date.now(), uptime, error ?? this.hungReason);
        switch (decision.action) {
            case "stop":
                await this.shutdown("the server stopped on its own");
                return;
            case "restart":
                this.say(`${decision.reason}. Restarting in ${decision.delayMs / 1000}s.`);
                this.setState("restarting", `The server stopped unexpectedly: ${decision.reason}.`);
                this.restartAt = Date.now() + decision.delayMs;
                await this.fallback.start(this.options.port);
                this.restartTimer = setTimeout(() => this.spawnServer(), decision.delayMs);
                return;
            case "portInUse":
                if (await this.isOtherHompagRunning()) {
                    await this.shutdown(`another hompag server is already running on port ${this.options.port}`);
                } else {
                    this.giveUp(`Port ${this.options.port} is being used by another program. Close it, or change the port in the hompag config, then restart.`);
                }
                return;
            case "giveUp":
                this.giveUp(this.lastServerLine && code === HompagExitCode.ConfigError
                    ? `${decision.reason}: ${this.lastServerLine}` : decision.reason);
                return;
        }
    }

    // ---------------------------------------------------------------------------------
    // Stop restarting, save a crash report, tell the user, and wait for them
    // ---------------------------------------------------------------------------------
    private giveUp(reason: string) {
        this.say(`Giving up: ${reason}`);
        const details = {
            reason,
            hompagVersion: this.serverVersion ?? this.options.target.version,
            launcherVersion: this.options.launcherVersion,
            mode: this.options.target.mode,
            platform: `${os.platform()} ${os.release()} ${os.arch()}`,
            nodeVersion: process.version,
            crashTimes: [...this.policy.recentCrashes],
            logTail: this.log.tail(150),
        };
        try {
            this.reportFile = this.reporter.writeReport(details, this.log.logsDir);
            this.say(`Crash report saved to ${this.reportFile}`);
        } catch (err) {
            this.say(`Could not save crash report: ${(err as Error).message}`);
        }
        this.issueUrl = this.reporter.issueUrl(details);
        this.setState("gaveUp", reason);
        this.fallback.start(this.options.port).then(listening => {
            const where = listening ? `Open http://localhost:${this.options.port} for details.` : `See ${this.log.currentFile}.`;
            this.options.notify?.("hompag has stopped", `${reason}. ${where}`);
        });
    }

    // ---------------------------------------------------------------------------------
    // Ask the server to stop, then insist
    // ---------------------------------------------------------------------------------
    private async stopChild() {
        const child = this.child;
        if (!child) return;
        this.monitor.stop();
        const exited = new Promise<void>(resolve => child.once("exit", () => resolve()));
        try {
            if (child.connected) child.send({ cmd: "shutdown" });
            else child.kill("SIGTERM");
        } catch {
            child.kill("SIGTERM");
        }
        const timeout = new Promise<"timeout">(resolve =>
            setTimeout(() => resolve("timeout"), this.options.stopTimeoutMs ?? 10000).unref());
        if (await Promise.race([exited, timeout]) === "timeout") {
            this.say(`Server ${child.pid} did not stop in time; killing it.`);
            child.kill("SIGKILL");
            await exited;
        }
        // Let the exit handler run before continuing
        await new Promise(resolve => setImmediate(resolve));
    }

    private async isOtherHompagRunning() {
        return !this.child && (await this.probe.check()).ok;
    }

    private clearRestartTimer() {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = undefined;
        this.restartAt = undefined;
    }

    private setState(state: SupervisorState, message: string) {
        this.state = state;
        this.message = message;
    }
}
