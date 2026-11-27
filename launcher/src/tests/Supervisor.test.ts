import { expect } from "chai";
import * as fs from "fs";
import * as http from "http";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { CrashPolicy } from "../CrashPolicy";
import { LaunchCommand, LaunchTarget, PrepareResult } from "../LaunchTarget";
import { LogSink } from "../LogSink";
import { Supervisor } from "../Supervisor";
import { SupervisorState } from "../SupervisorStatus";

const fakeServer = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "fakeServer.mjs");

class FakeTarget implements LaunchTarget {
    readonly mode = "prod";
    readonly version = "9.9.9-fake";
    constructor(private env: NodeJS.ProcessEnv, private prepareResult: PrepareResult = { ok: true }) {}
    async prepare() { return this.prepareResult; }
    launchCommand(): LaunchCommand {
        return { command: process.execPath, args: [fakeServer], cwd: os.tmpdir(), env: { ...process.env, ...this.env } };
    }
}

const freePort = () => new Promise<number>((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
        const port = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(port));
    });
});

const waitFor = async (what: string, condition: () => boolean, timeoutMs = 10000) => {
    const deadline = Date.now() + timeoutMs;
    while (!condition()) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
        await new Promise(r => setTimeout(r, 25));
    }
}

const get = (port: number, urlPath: string, method = "GET") => new Promise<{ status: number, body: string }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: urlPath, method }, (res) => {
        let body = "";
        res.on("data", (c) => body += c);
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
});

describe("Supervisor (with a fake server process)", () => {
    let dir: string;
    let counter: string;
    let port: number;
    let supervisor: Supervisor | undefined;
    let notifications: string[];

    const starts = () => fs.existsSync(counter) ? fs.readFileSync(counter, "utf8").trim().split("\n").length : 0;

    const create = (env: NodeJS.ProcessEnv, options: { maxCrashes?: number, prepare?: PrepareResult } = {}) => {
        supervisor = new Supervisor({
            target: new FakeTarget({ FAKE_COUNTER: counter, ...env }, options.prepare),
            port,
            log: new LogSink(path.join(dir, "logs")),
            policy: new CrashPolicy({ baseDelayMs: 50, maxDelayMs: 200, maxCrashes: options.maxCrashes ?? 5 }),
            notify: (title, message) => notifications.push(`${title}: ${message}`),
            health: { startupPollMs: 50, intervalMs: 100, startupGraceMs: 5000, maxFailures: 2 },
            probeTimeoutMs: 300,
            stopTimeoutMs: 2000,
            launcherVersion: "test",
        });
        return supervisor;
    }
    const stateIs = (state: SupervisorState) => () => supervisor!.status().state === state;

    beforeEach(async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "hompag-supervisor-test-"));
        counter = path.join(dir, "starts.txt");
        port = await freePort();
        notifications = [];
    });

    afterEach(async () => {
        await supervisor?.shutdown("test over");
        supervisor = undefined;
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("starts the server, reports it healthy, and stops it gracefully", async () => {
        const target = create({});
        await target.start();
        await waitFor("running", stateIs("running"));
        expect(target.status().serverPid).a("number");
        expect(target.status().hompagVersion).equal("9.9.9-fake");

        await target.shutdown("test");
        await target.done;
        expect(fs.readFileSync(counter + ".shutdowns", "utf8")).contains("graceful");
        expect(target.status().state).equal("stopped");
    });

    it("restarts after crashes and recovers", async () => {
        const target = create({ FAKE_CRASH_TIMES: "2" });
        await target.start();
        await waitFor("third start to be healthy", () => starts() === 3 && stateIs("running")());
        expect(target.status().crashCount).equal(2);
    });

    it("serves the fallback page while waiting to restart", async () => {
        supervisor = create({ FAKE_CRASH_TIMES: "99" });
        // Slow restarts so we can look at the page
        (supervisor as any).policy = new CrashPolicy({ baseDelayMs: 3000, maxCrashes: 5 });
        await supervisor.start();
        await waitFor("restarting", stateIs("restarting"));
        const page = await get(port, "/home");
        expect(page.status).equal(503);
        expect(page.body).contains("hompag crashed");
        const api = await get(port, "/api/pages/home");
        expect(api.status).equal(503);
        expect(JSON.parse(api.body).errorMessage).contains("not running");
    });

    it("gives up after too many crashes, saves a report, and offers restart + issue", async () => {
        const target = create({ FAKE_CRASH_TIMES: "99" }, { maxCrashes: 3 });
        await target.start();
        await waitFor("gave up", stateIs("gaveUp"));
        expect(starts()).equal(3);

        const status = target.status();
        expect(status.issueUrl).contains("github.com/nebosite/hompag/issues/new");
        expect(fs.existsSync(status.reportFile!)).equal(true);
        await waitFor("notification", () => notifications.length > 0);
        expect(notifications[0]).contains("hompag has stopped");

        const page = await get(port, "/");
        expect(page.body).contains("hompag has stopped");
        expect(page.body).contains("Restart hompag");
        expect(page.body).contains("Report issue on GitHub");

        // Nothing restarts on its own...
        await new Promise(r => setTimeout(r, 300));
        expect(starts()).equal(3);

        // ... until the user presses Restart
        const restart = await get(port, "/_hompag/restart", "POST");
        expect(restart.status).equal(303);
        await waitFor("fourth start", () => starts() === 4);
    });

    it("gives up immediately on a configuration error", async () => {
        const target = create({ FAKE_BEHAVIOR: "config" });
        await target.start();
        await waitFor("gave up", stateIs("gaveUp"));
        expect(starts()).equal(1);
        expect(target.status().message).contains("configuration");
        expect(target.status().message).contains("no store path");
    });

    it("kills and restarts a server that stops responding", async () => {
        const target = create({ FAKE_BEHAVIOR: "hang" });
        await target.start();
        await waitFor("second start", () => starts() >= 2);
        expect(target.status().crashCount).greaterThan(0);
    });

    it("shows the failure if preparation (e.g. a dev build) fails", async () => {
        const target = create({}, { prepare: { ok: false, error: "build failed: syntax error" } });
        await target.start();
        expect(target.status().state).equal("gaveUp");
        expect(target.status().message).contains("syntax error");
        expect(starts()).equal(0);
    });

    it("steps aside when another hompag server already owns the port", async () => {
        const other = http.createServer((req, res) => res.end(JSON.stringify({ version: "other" })));
        await new Promise<void>(r => other.listen(port, () => r()));
        try {
            const target = create({});
            await target.start();
            await target.done;
            expect(target.status().state).equal("stopped");
            expect(starts()).equal(0);
        } finally {
            await new Promise(r => other.close(r));
        }
    });

    it("restarts on request, resetting the crash count", async () => {
        const target = create({});
        await target.start();
        await waitFor("running", stateIs("running"));
        const firstPid = target.status().serverPid;
        await target.restart("test");
        await waitFor("running again", () => stateIs("running")() && target.status().serverPid !== firstPid);
        expect(starts()).equal(2);
        expect(target.status().crashCount).equal(0);
    });
});
