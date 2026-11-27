import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------------
// Writes supervisor events and server output to a daily log file, and keeps the
// most recent lines in memory for crash reports and the fallback page.
// Lines are appended synchronously so nothing is lost if the supervisor dies.
// ---------------------------------------------------------------------------------
export class LogSink {
    private recent: string[] = [];

    constructor(
        readonly logsDir: string,
        private keepDays = 14,
        private recentLimit = 300,
        private echo: ((line: string) => void) | undefined = undefined,
        private now: () => Date = () => new Date()) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    get currentFile() {
        const d = this.now();
        const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return path.join(this.logsDir, `hompag-${stamp}.log`);
    }

    // ---------------------------------------------------------------------------------
    // Log a line from a named source ("supervisor", "server", "build" ...)
    // ---------------------------------------------------------------------------------
    write(source: string, text: string) {
        for (const line of text.split(/\r?\n/)) {
            if (line.trim() === "") continue;
            const formatted = `${this.now().toISOString()} [${source}] ${line}`;
            this.recent.push(formatted);
            if (this.recent.length > this.recentLimit) this.recent.shift();
            try {
                fs.appendFileSync(this.currentFile, formatted + "\n");
            } catch {
                // Logging must never take down the supervisor
            }
            this.echo?.(formatted);
        }
    }

    // ---------------------------------------------------------------------------------
    // The most recent lines logged by this process
    // ---------------------------------------------------------------------------------
    tail(count = this.recentLimit): string[] {
        return this.recent.slice(-count);
    }

    // ---------------------------------------------------------------------------------
    // Delete daily logs and crash reports older than keepDays
    // ---------------------------------------------------------------------------------
    prune() {
        const cutoff = this.now().getTime() - this.keepDays * 24 * 3600 * 1000;
        for (const name of fs.readdirSync(this.logsDir)) {
            if (!/^(hompag-|crash-).*\.(log|md)$/.test(name)) continue;
            const file = path.join(this.logsDir, name);
            try {
                if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
            } catch {
                // ignore files that vanish or are locked
            }
        }
    }

    // ---------------------------------------------------------------------------------
    // Read the last lines of the newest log file (for "hompag logs" from another process)
    // ---------------------------------------------------------------------------------
    static readLatest(logsDir: string, count: number): { file?: string, lines: string[] } {
        if (!fs.existsSync(logsDir)) return { lines: [] };
        const files = fs.readdirSync(logsDir).filter(n => /^hompag-.*\.log$/.test(n)).sort();
        if (files.length === 0) return { lines: [] };
        const file = path.join(logsDir, files[files.length - 1]);
        const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(l => l !== "");
        return { file, lines: lines.slice(-count) };
    }
}
