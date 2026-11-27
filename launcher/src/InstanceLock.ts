import * as fs from "fs";
import * as path from "path";

export interface LockInfo {
    pid: number
    startedAt: number
    /** Port of the supervisor's control channel (see ControlServer) */
    controlPort?: number
    /** Secret the CLI must present to the control channel */
    token?: string
}

// ---------------------------------------------------------------------------------
// Guarantees one supervisor per user.  Autostart, a manual "hompag start", and a
// service manager restart can all race to launch; whoever creates the lock file
// first wins and the rest exit quietly.  A lock left behind by a dead process is
// taken over.
// ---------------------------------------------------------------------------------
export class InstanceLock {
    private held = false;

    constructor(readonly file: string, private pid = process.pid) {}

    acquire(): boolean {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const fd = fs.openSync(this.file, "wx");
                fs.writeSync(fd, JSON.stringify({ pid: this.pid, startedAt: Date.now() }));
                fs.closeSync(fd);
                this.held = true;
                return true;
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
            }
            const owner = InstanceLock.read(this.file);
            if (owner && owner.pid !== this.pid && InstanceLock.isAlive(owner.pid)) return false;
            // Stale (or unreadable) lock: remove and try again
            try { fs.unlinkSync(this.file); } catch { /* someone else removed it */ }
        }
        return false;
    }

    // ---------------------------------------------------------------------------------
    // Add control-channel details once they're known
    // ---------------------------------------------------------------------------------
    update(info: Partial<LockInfo>) {
        if (!this.held) return;
        const current = InstanceLock.read(this.file) ?? { pid: this.pid, startedAt: Date.now() };
        fs.writeFileSync(this.file, JSON.stringify({ ...current, ...info, pid: this.pid }));
    }

    release() {
        if (!this.held) return;
        this.held = false;
        const owner = InstanceLock.read(this.file);
        if (owner?.pid === this.pid) {
            try { fs.unlinkSync(this.file); } catch { /* already gone */ }
        }
    }

    // ---------------------------------------------------------------------------------
    // The live owner of the lock, if any
    // ---------------------------------------------------------------------------------
    static liveOwner(file: string): LockInfo | undefined {
        const info = InstanceLock.read(file);
        return info && InstanceLock.isAlive(info.pid) ? info : undefined;
    }

    static read(file: string): LockInfo | undefined {
        try {
            const info = JSON.parse(fs.readFileSync(file, "utf8"));
            return typeof info?.pid === "number" ? info : undefined;
        } catch {
            return undefined;
        }
    }

    static isAlive(pid: number): boolean {
        try {
            process.kill(pid, 0);
            return true;
        } catch (err) {
            // EPERM: it exists but belongs to someone else
            return (err as NodeJS.ErrnoException).code === "EPERM";
        }
    }
}
