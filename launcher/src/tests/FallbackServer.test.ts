import { expect } from "chai";
import * as http from "http";
import { FallbackPage } from "../FallbackPage";
import { FallbackServer } from "../FallbackServer";
import { SupervisorStatus } from "../SupervisorStatus";

const request = (remoteAddress: string, headers: http.IncomingHttpHeaders) =>
    ({ socket: { remoteAddress }, headers } as unknown as http.IncomingMessage);

const status = (overrides: Partial<SupervisorStatus> = {}): SupervisorStatus => ({
    state: "gaveUp", message: "it broke <badly>", mode: "prod", port: 8101, hompagVersion: "1.0.0",
    launcherVersion: "1.0.0", supervisorPid: 1, crashCount: 5, logFile: "/logs/x.log", ...overrides
});

describe("FallbackServer", () => {
    it("only lets this computer press Restart", () => {
        expect(FallbackServer.isLocalRequest(request("127.0.0.1", {}))).equal(true);
        expect(FallbackServer.isLocalRequest(request("::1", { origin: "http://localhost:8101" }))).equal(true);
        expect(FallbackServer.isLocalRequest(request("192.168.1.20", {}))).equal(false);
    });

    it("rejects a Restart posted by another web site", () => {
        expect(FallbackServer.isLocalRequest(request("127.0.0.1", { origin: "https://evil.example" }))).equal(false);
        expect(FallbackServer.isLocalRequest(request("127.0.0.1", { origin: "null" }))).equal(false);
        expect(FallbackServer.isLocalRequest(request("127.0.0.1", { origin: "http://localhost.evil.example" }))).equal(false);
    });

    it("sends the user back to the page they were on", () => {
        const req = (referer?: string) => ({ headers: { host: "localhost:8101", referer } } as unknown as http.IncomingMessage);
        expect(FallbackServer.returnPath(req("http://localhost:8101/work?x=1"))).equal("/work?x=1");
        expect(FallbackServer.returnPath(req("https://elsewhere.example/home"))).equal("/");
        expect(FallbackServer.returnPath(req(undefined))).equal("/");
    });
});

describe("FallbackPage", () => {
    it("escapes text and offers restart and report when stopped", () => {
        const html = FallbackPage.render(status({ issueUrl: "https://github.com/x?a=1&b=2" }), ["<script>alert(1)</script>"]);
        expect(html).contains("it broke &lt;badly&gt;");
        expect(html).contains("&lt;script&gt;");
        expect(html).not.contains("<script>alert");
        expect(html).contains("Restart hompag");
        expect(html).contains('href="https://github.com/x?a=1&amp;b=2"');
        expect(html).not.contains('http-equiv="refresh"');
    });

    it("counts down and auto-refreshes while restarting", () => {
        const html = FallbackPage.render(status({ state: "restarting", restartAt: 10000 }), [], 6000);
        expect(html).contains("restarting in 4s");
        expect(html).contains('http-equiv="refresh"');
    });
});
