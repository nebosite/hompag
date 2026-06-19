import { expect } from "chai";
import { safeSend, MockResponse, UserError, PageResponse } from "../helpers/SafeSend";
import { ILogger } from "../helpers/logger";

// Minimal logger that records what it was told to log.
class RecordingLogger implements ILogger {
    lines: string[] = [];
    errors: string[] = [];
    logLine(text: string) { this.lines.push(text); }
    logError(text: string) { this.errors.push(text); }
}

describe("safeSend", () => {
    it("wraps successful data in a {data} envelope", async () => {
        const res = new MockResponse();
        const logger = new RecordingLogger();
        await safeSend(res as any, logger, "getThing", async () => ({ x: 1 }));
        expect(res.messagesSent).equal(JSON.stringify({ data: { x: 1 } }));
        expect(logger.errors).deep.equal([]);
    });

    it("passes UserError messages straight through to the client", async () => {
        const res = new MockResponse();
        const logger = new RecordingLogger();
        await safeSend(res as any, logger, "getThing", async () => { throw new UserError("bad input"); });
        expect(res.messagesSent).equal(JSON.stringify({ errorMessage: "bad input" }));
        // User errors are expected, so they should not be logged as server errors.
        expect(logger.errors).deep.equal([]);
    });

    it("hides unexpected errors behind a generic message and logs them", async () => {
        const res = new MockResponse();
        const logger = new RecordingLogger();
        await safeSend(res as any, logger, "getThing", async () => { throw new Error("kaboom"); });

        const parsed = JSON.parse(res.messagesSent);
        expect(parsed.errorMessage).match(/server error in getThing/);
        expect(parsed.errorMessage).match(/timecode \d+/);
        // The real cause is logged server-side, not leaked to the client.
        expect(logger.errors.length).equal(1);
        expect(logger.errors[0]).match(/kaboom/);
        expect(parsed.errorMessage).not.match(/kaboom/);
    });

    it("sends a PageResponse with its own status code and raw content", async () => {
        const res = new MockResponse();
        const logger = new RecordingLogger();
        await safeSend(res as any, logger, "page", async () => new PageResponse("<html/>"));
        expect(res.myStatus).equal(400);
        expect(res.messagesSent).equal("<html/>");
    });

    it("builds a redirect PageResponse pointing at the target url", async () => {
        const res = new MockResponse();
        const logger = new RecordingLogger();
        await safeSend(res as any, logger, "page", async () => PageResponse.Redirect("https://example.com/back"));
        expect(res.messagesSent).contains("https://example.com/back");
        expect(res.messagesSent).contains("Refresh");
    });
});
