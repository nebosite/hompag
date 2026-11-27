import { HompagExitCode } from 'hompag-common';
import { ILogger } from './logger';

// ---------------------------------------------------------------------------------
// Owns every way the server process can end: OS signals, a shutdown request from
// the supervisor over IPC (needed on Windows, which has no SIGTERM), and
// unhandled errors.  Every path flushes cached pages to disk (with a timeout so a
// wedged flush can't keep a broken process alive) and then exits exactly once
// with a meaningful exit code.
// ---------------------------------------------------------------------------------
export class ShutdownCoordinator {
    private _shuttingDown = false;

    get isShuttingDown() { return this._shuttingDown; }

    constructor(
        private logger: ILogger,
        private flush: () => Promise<void>,
        private exit: (code: number) => void = (code) => process.exit(code),
        private flushTimeoutMs = 5000) {}

    // ---------------------------------------------------------------------------------
    // Hook up process events
    // ---------------------------------------------------------------------------------
    install(proc: NodeJS.Process = process) {
        for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR2']) {
            proc.on(signal, () => this.shutdown(signal, HompagExitCode.Clean));
        }
        proc.on('message', (message: any) => {
            if (message?.cmd === 'shutdown') this.shutdown('supervisor request', HompagExitCode.Clean);
        });
        // When started by the supervisor, don't outlive it: an orphaned server
        // would hold the port and stop a new supervisor from taking over.
        proc.on('disconnect', () => this.shutdown('supervisor went away', HompagExitCode.Clean));
        proc.on('uncaughtException', (err) => this.crash('Uncaught exception', err));
        proc.on('unhandledRejection', (reason) => this.crash('Unhandled promise rejection', reason));
    }

    // ---------------------------------------------------------------------------------
    // Something went wrong that nobody handled.  Exit into a clean restart rather
    // than limp along in an unknown state.
    // ---------------------------------------------------------------------------------
    crash(what: string, err: unknown) {
        const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
        this.logger.logError(`${what}: ${detail}`);
        return this.shutdown(what, HompagExitCode.Crash);
    }

    // ---------------------------------------------------------------------------------
    // Flush and exit.  Only the first request counts.
    // ---------------------------------------------------------------------------------
    async shutdown(reason: string, exitCode: number) {
        if (this._shuttingDown) return;
        this._shuttingDown = true;
        this.logger.logLine(`Shutting down (${reason}), exit code ${exitCode}. Flushing data...`);

        let timer: NodeJS.Timeout | undefined;
        const timeout = new Promise<void>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`flush took longer than ${this.flushTimeoutMs}ms`)), this.flushTimeoutMs);
        });
        try {
            await Promise.race([this.flush(), timeout]);
            this.logger.logLine("Flush complete.  B'Bye ---------------------------------");
        } catch (err) {
            this.logger.logError(`Flush failed during shutdown: ${(err as Error).message}`);
        } finally {
            if (timer) clearTimeout(timer);
        }
        this.exit(exitCode);
    }
}
