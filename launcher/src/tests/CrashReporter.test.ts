import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CrashDetails, CrashReporter } from "../CrashReporter";

const details = (overrides: Partial<CrashDetails> = {}): CrashDetails => ({
    reason: "server crashed with exit code 1",
    hompagVersion: "0.5.0",
    launcherVersion: "0.5.0",
    mode: "prod",
    platform: "win32 10.0",
    nodeVersion: "v22.0.0",
    crashTimes: [Date.UTC(2026, 0, 1)],
    logTail: ["line one", "line two"],
    ...overrides
});

describe("CrashReporter", () => {
    it("redacts secrets and the home folder in either slash style", () => {
        const target = new CrashReporter("o/r", ["sup3rs3cret"], "C:\\Users\\pat");
        const text = target.redact("key=sup3rs3cret at C:\\Users\\pat\\store and c:/users/pat/x");
        expect(text).equal("key=[redacted] at ~\\store and ~/x");
    });

    it("ignores empty or tiny secrets so it doesn't shred the log", () => {
        const target = new CrashReporter("o/r", ["", "ab"]);
        expect(target.redact("abc")).equal("abc");
    });

    it("builds a prefilled new-issue url for the repo", () => {
        const url = new CrashReporter("nebosite/hompag").issueUrl(details());
        expect(url.startsWith("https://github.com/nebosite/hompag/issues/new?")).equal(true);
        const params = new URL(url).searchParams;
        expect(params.get("title")).equal("Crash report: server crashed with exit code 1");
        expect(params.get("body")).contains("line two");
        expect(params.get("body")).contains("0.5.0 (prod mode)");
    });

    it("trims the oldest log lines to keep the url short", () => {
        const logTail = Array.from({ length: 300 }, (_, i) => `log line number ${i} ` + "x".repeat(60));
        const url = new CrashReporter().issueUrl(details({ logTail }));
        expect(url.length).lessThan(CrashReporter.MAX_URL_LENGTH + 1);
        const body = new URL(url).searchParams.get("body")!;
        expect(body).contains("log line number 299");
        expect(body).not.contains("log line number 0 ");
    });

    it("writes a redacted report file", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hompag-crash-test-"));
        try {
            const file = new CrashReporter("o/r", ["topsecretkey"]).writeReport(
                details({ logTail: ["using topsecretkey"] }), dir);
            const text = fs.readFileSync(file, "utf8");
            expect(text).contains("[redacted]");
            expect(text).not.contains("topsecretkey");
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
