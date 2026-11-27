
export interface HealthResult {
    ok: boolean
    version?: string
    error?: string
}

// ---------------------------------------------------------------------------------
// Asks a hompag server on the given port whether it is alive
// ---------------------------------------------------------------------------------
export class HealthProbe {
    constructor(private port: number, private timeoutMs = 3000) {}

    async check(): Promise<HealthResult> {
        try {
            const response = await fetch(`http://127.0.0.1:${this.port}/api/am_i_healthy`,
                { signal: AbortSignal.timeout(this.timeoutMs), headers: { "Cache-Control": "no-cache" } });
            if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
            const body = JSON.parse(await response.text());
            if (typeof body?.version !== "string") return { ok: false, error: "not a hompag server" };
            return { ok: true, version: body.version };
        } catch (err) {
            return { ok: false, error: (err as Error).message };
        }
    }

    // ---------------------------------------------------------------------------------
    // Poll until healthy or the timeout passes
    // ---------------------------------------------------------------------------------
    async waitUntilHealthy(timeoutMs: number, pollMs = 1000): Promise<HealthResult> {
        const deadline = Date.now() + timeoutMs;
        let last: HealthResult = { ok: false, error: "not checked" };
        while (Date.now() < deadline) {
            last = await this.check();
            if (last.ok) return last;
            await new Promise(r => setTimeout(r, pollMs));
        }
        return last;
    }
}
