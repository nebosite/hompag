import { ControlServer } from "./ControlServer";
import { CrashReporter } from "./CrashReporter";
import { Installation } from "./Installation";
import { InstanceLock } from "./InstanceLock";
import { LogSink } from "./LogSink";
import { Notifier } from "./Notifier";
import { Supervisor } from "./Supervisor";
import * as os from "os";

// ---------------------------------------------------------------------------------
// "hompag run": what autostart launches.  Takes the single-instance lock, opens
// the control channel for the CLI, and runs the Supervisor until it's told to
// stop.  If another supervisor is already running, exits quietly (that's what
// makes autostart idempotent).
// ---------------------------------------------------------------------------------
export class SupervisorHost {
    constructor(private installation: Installation, private launcherVersion: string, private echo: boolean) {}

    async run(): Promise<number> {
        const paths = this.installation.paths;
        const lock = new InstanceLock(paths.lockFile);
        if (!lock.acquire()) {
            const owner = InstanceLock.read(paths.lockFile);
            if (this.echo) console.log(`hompag is already running (supervisor pid ${owner?.pid}).`);
            return 0;
        }

        const log = new LogSink(paths.logsDir, 14, 300, this.echo ? (line) => console.log(line) : undefined);
        log.prune();

        let supervisor: Supervisor;
        try {
            const config = this.installation.config();
            supervisor = new Supervisor({
                target: this.installation.launchTarget(),
                port: config.port,
                log,
                reporter: new CrashReporter("nebosite/hompag", this.installation.secrets(), os.homedir()),
                notify: (title, message) => new Notifier().notify(title, message),
                launcherVersion: this.launcherVersion,
            });
        } catch (err) {
            log.write("supervisor", `Cannot start: ${(err as Error).message}`);
            lock.release();
            return 1;
        }

        const control = new ControlServer({
            status: () => supervisor.status(),
            restart: () => supervisor.restart("restart requested from the command line"),
            stop: () => supervisor.shutdown("stop requested from the command line"),
        });
        lock.update({ controlPort: await control.start(), token: control.token });

        // Service managers (launchd, systemd) and Ctrl+C stop us with signals
        for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
            process.on(signal, () => { supervisor.shutdown(`received ${signal}`).catch(() => {}); });
        }
        // The supervisor must not die quietly; if it does, log why.  On macOS and
        // Linux the service manager restarts it.
        process.on("uncaughtException", (err) => {
            log.write("supervisor", `Supervisor error: ${err.stack ?? err.message}`);
            lock.release();
            process.exit(1);
        });
        process.on("exit", () => lock.release());

        await supervisor.start();
        await supervisor.done;
        await control.stop();
        lock.release();
        return 0;
    }
}
