import { ControlServer } from "./ControlServer";
import { InstanceLock, LockInfo } from "./InstanceLock";
import { SupervisorStatus } from "./SupervisorStatus";

// ---------------------------------------------------------------------------------
// The CLI side of the control channel (see ControlServer)
// ---------------------------------------------------------------------------------
export class ControlClient {
    constructor(private lockFile: string) {}

    /** The running supervisor, or undefined if none */
    get supervisor(): LockInfo | undefined {
        return InstanceLock.liveOwner(this.lockFile);
    }

    async status(): Promise<SupervisorStatus | undefined> {
        const response = await this.send("GET", "/status");
        return response?.ok ? await response.json() as SupervisorStatus : undefined;
    }

    async restart(): Promise<boolean> {
        return !!(await this.send("POST", "/restart"))?.ok;
    }

    async stop(): Promise<boolean> {
        return !!(await this.send("POST", "/stop"))?.ok;
    }

    // ---------------------------------------------------------------------------------
    // Wait for the supervisor process to go away (after stop)
    // ---------------------------------------------------------------------------------
    async waitForExit(timeoutMs: number): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            if (!this.supervisor) return true;
            await new Promise(r => setTimeout(r, 250));
        }
        return !this.supervisor;
    }

    private async send(method: string, path: string): Promise<Response | undefined> {
        const info = this.supervisor;
        if (!info?.controlPort || !info.token) return undefined;
        try {
            return await fetch(`http://127.0.0.1:${info.controlPort}${path}`, {
                method,
                headers: { [ControlServer.TOKEN_HEADER]: info.token },
                signal: AbortSignal.timeout(5000),
            });
        } catch {
            return undefined;
        }
    }
}
