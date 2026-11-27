import * as http from "http";
import { Socket } from "net";
import { FallbackPage } from "./FallbackPage";
import { SupervisorStatus } from "./SupervisorStatus";

export interface FallbackHandlers {
    status: () => SupervisorStatus
    logTail: () => readonly string[]
    restart: () => void
}

// ---------------------------------------------------------------------------------
// A tiny HTTP server that answers on the hompag port only while the real server
// is down.  Every page request gets the status page (with a 503, so nothing
// caches it); API calls get a JSON 503 so the client app fails soft.
// ---------------------------------------------------------------------------------
export class FallbackServer {
    private server?: http.Server;
    private sockets = new Set<Socket>();

    constructor(private handlers: FallbackHandlers) {}

    get isListening() { return !!this.server?.listening; }

    // ---------------------------------------------------------------------------------
    // Start listening.  Resolves false if the port is taken.
    // ---------------------------------------------------------------------------------
    start(port: number): Promise<boolean> {
        if (this.server) return Promise.resolve(true);
        return new Promise((resolve) => {
            const server = http.createServer((req, res) => this.handle(req, res));
            server.on("connection", (socket) => {
                this.sockets.add(socket);
                socket.on("close", () => this.sockets.delete(socket));
            });
            server.once("error", () => {
                this.server = undefined;
                resolve(false);
            });
            server.listen(port, () => {
                this.server = server;
                resolve(true);
            });
        });
    }

    // ---------------------------------------------------------------------------------
    // Stop and drop keep-alive connections so the port is free right away and the
    // browser's next refresh reaches the real server.
    // ---------------------------------------------------------------------------------
    stop(): Promise<void> {
        const server = this.server;
        this.server = undefined;
        if (!server) return Promise.resolve();
        return new Promise((resolve) => {
            server.close(() => resolve());
            for (const socket of this.sockets) socket.destroy();
            this.sockets.clear();
        });
    }

    private handle(req: http.IncomingMessage, res: http.ServerResponse) {
        const url = new URL(req.url ?? "/", "http://localhost");
        const noCache = { "Cache-Control": "no-store" };

        if (url.pathname === "/_hompag/restart" && req.method === "POST") {
            if (!FallbackServer.isLocalRequest(req)) {
                res.writeHead(403, noCache).end("Restart is only allowed from this computer");
                return;
            }
            // Restarting closes this server, so finish the reply first
            res.on("finish", () => this.handlers.restart());
            res.writeHead(303, { ...noCache, Location: FallbackServer.returnPath(req) }).end();
            return;
        }

        if (url.pathname === "/_hompag/status") {
            res.writeHead(200, { ...noCache, "Content-Type": "application/json" })
                .end(JSON.stringify(this.handlers.status(), null, 2));
            return;
        }

        const status = this.handlers.status();
        if (url.pathname.startsWith("/api/") || url.pathname === "/subscribe") {
            res.writeHead(503, { ...noCache, "Content-Type": "application/json", "Retry-After": "3" })
                .end(JSON.stringify({ errorMessage: `hompag server is not running: ${status.message}` }));
            return;
        }

        res.writeHead(503, { ...noCache, "Content-Type": "text/html; charset=utf-8", "Retry-After": "3" })
            .end(FallbackPage.render(status, this.handlers.logTail().slice(-60)));
    }

    // ---------------------------------------------------------------------------------
    // Where to go after Restart: back to the page the user was on (same site only)
    // ---------------------------------------------------------------------------------
    static returnPath(req: http.IncomingMessage) {
        try {
            const referer = new URL(req.headers.referer ?? "");
            if (referer.host === req.headers.host && !referer.pathname.startsWith("/_hompag/")) {
                return referer.pathname + referer.search;
            }
        } catch {
            // no or bad referer
        }
        return "/";
    }

    // ---------------------------------------------------------------------------------
    // Only accept control actions from this machine, and not from other web sites
    // (a page on the internet could otherwise POST to localhost).
    // ---------------------------------------------------------------------------------
    static isLocalRequest(req: http.IncomingMessage) {
        const address = req.socket.remoteAddress ?? "";
        const loopback = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
        const origin = req.headers.origin;
        const originOk = !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
        return loopback && originOk;
    }
}
