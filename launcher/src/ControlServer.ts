import { randomBytes } from "crypto";
import * as http from "http";
import { AddressInfo } from "net";
import { SupervisorStatus } from "./SupervisorStatus";

export interface ControlHandlers {
    status: () => SupervisorStatus
    restart: () => Promise<void>
    stop: () => Promise<void>
}

// ---------------------------------------------------------------------------------
// Lets "hompag status|restart|stop" talk to the running supervisor.  Listens on
// a random loopback port, and every request must carry a random token that only
// the lock file (readable by this user) contains.
// ---------------------------------------------------------------------------------
export class ControlServer {
    static readonly TOKEN_HEADER = "x-hompag-token";
    readonly token = randomBytes(16).toString("hex");
    private server?: http.Server;

    constructor(private handlers: ControlHandlers) {}

    start(): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => this.handle(req, res));
            server.once("error", reject);
            server.listen(0, "127.0.0.1", () => {
                this.server = server;
                resolve((server.address() as AddressInfo).port);
            });
        });
    }

    stop(): Promise<void> {
        const server = this.server;
        this.server = undefined;
        return new Promise((resolve) => server ? server.close(() => resolve()) : resolve());
    }

    private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
        const reply = (code: number, body: unknown) =>
            res.writeHead(code, { "Content-Type": "application/json" }).end(JSON.stringify(body));

        if (req.headers[ControlServer.TOKEN_HEADER] !== this.token) return reply(403, { error: "bad token" });

        try {
            switch (`${req.method} ${req.url}`) {
                case "GET /status": return reply(200, this.handlers.status());
                case "POST /restart":
                    // Reply first; the restart can take a while
                    reply(202, { ok: true });
                    await this.handlers.restart();
                    return;
                case "POST /stop":
                    reply(202, { ok: true });
                    await this.handlers.stop();
                    return;
                default: return reply(404, { error: "unknown command" });
            }
        } catch (err) {
            if (!res.headersSent) reply(500, { error: (err as Error).message });
        }
    }
}
