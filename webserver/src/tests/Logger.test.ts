import { expect } from "chai";
import { ILogger, Logger, LoggerPrefixer } from "../helpers/logger";

class RecordingLogger implements ILogger {
    lines: string[] = [];
    errors: string[] = [];
    logLine(text: string) { this.lines.push(text); }
    logError(text: string) { this.errors.push(text); }
}

describe("LoggerPrefixer", () => {
    it("prepends its prefix to logged lines", () => {
        const root = new RecordingLogger();
        const prefixed = new LoggerPrefixer(root, "PageCache");
        prefixed.logLine("hello");
        expect(root.lines).deep.equal(["PageCache: hello"]);
    });

    it("prepends its prefix to logged errors", () => {
        const root = new RecordingLogger();
        const prefixed = new LoggerPrefixer(root, "PageCache");
        prefixed.logError("boom");
        expect(root.errors).deep.equal(["PageCache: boom"]);
    });

    it("can be nested, stacking prefixes", () => {
        const root = new RecordingLogger();
        const inner = new LoggerPrefixer(new LoggerPrefixer(root, "A"), "B");
        inner.logLine("x");
        expect(root.lines).deep.equal(["A: B: x"]);
    });
});

describe("Logger.getCurrentDateString", () => {
    it("formats as YYYY/MM/DD HH:MM:SS.fff", () => {
        const stamp = new Logger().getCurrentDateString();
        expect(stamp).match(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
});
