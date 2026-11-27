import * as fs from "fs";
import * as path from "path";

export interface CrashDetails {
    reason: string
    hompagVersion: string
    launcherVersion: string
    mode: string
    platform: string
    nodeVersion: string
    crashTimes: readonly number[]
    logTail: readonly string[]
}

// ---------------------------------------------------------------------------------
// Turns a crash into a GitHub issue the user can review and submit.  We open a
// prefilled "new issue" URL rather than posting anything ourselves, so nothing
// leaves the machine without the user seeing it.  Secrets and the user's home
// folder are redacted, and the log is trimmed to keep the URL a safe length.
// ---------------------------------------------------------------------------------
export class CrashReporter {
    static readonly MAX_URL_LENGTH = 7000;

    constructor(
        private repo = "nebosite/hompag",
        private secrets: string[] = [],
        private homeDir = "") {}

    // ---------------------------------------------------------------------------------
    // Remove anything private from text
    // ---------------------------------------------------------------------------------
    redact(text: string): string {
        let result = text;
        for (const secret of this.secrets) {
            if (secret && secret.length >= 4) result = result.split(secret).join("[redacted]");
        }
        if (this.homeDir) {
            // Match the home dir with either slash style, case-insensitively (Windows)
            const pattern = this.homeDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\\|\//g, "[\\\\/]");
            result = result.replace(new RegExp(pattern, "gi"), "~");
        }
        return result;
    }

    title(details: CrashDetails) {
        return `Crash report: ${this.redact(details.reason)}`.slice(0, 200);
    }

    // ---------------------------------------------------------------------------------
    // Markdown body with the environment and the last logLines of the log
    // ---------------------------------------------------------------------------------
    body(details: CrashDetails, logLines = details.logTail.length) {
        const crashes = details.crashTimes.map(t => `- ${new Date(t).toISOString()}`).join("\n") || "- (none recorded)";
        const log = details.logTail.slice(-logLines).join("\n");
        return this.redact([
            "_This report was prepared by the hompag supervisor. Please add anything you were doing when it crashed._",
            "",
            "### What happened",
            details.reason,
            "",
            "### Environment",
            `- hompag: ${details.hompagVersion} (${details.mode} mode)`,
            `- launcher: ${details.launcherVersion}`,
            `- OS: ${details.platform}`,
            `- Node: ${details.nodeVersion}`,
            "",
            "### Recent crashes",
            crashes,
            "",
            `### Log (last ${Math.min(logLines, details.logTail.length)} lines)`,
            "```",
            log,
            "```",
        ].join("\n"));
    }

    // ---------------------------------------------------------------------------------
    // A github.com "new issue" URL with title and body filled in.  Drops the
    // oldest log lines until the URL fits.
    // ---------------------------------------------------------------------------------
    issueUrl(details: CrashDetails): string {
        const title = this.title(details);
        for (let lines = details.logTail.length; lines >= 0; lines = lines > 10 ? lines - 10 : lines - 1) {
            const url = this.buildUrl(title, this.body(details, lines));
            if (url.length <= CrashReporter.MAX_URL_LENGTH) return url;
        }
        return this.buildUrl(title, "The crash log was too large to include. Please attach the crash report file from the hompag logs folder.");
    }

    private buildUrl(title: string, body: string) {
        return `https://github.com/${this.repo}/issues/new?labels=crash`
            + `&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    }

    // ---------------------------------------------------------------------------------
    // Save the full (redacted) report next to the logs; returns the file path
    // ---------------------------------------------------------------------------------
    writeReport(details: CrashDetails, logsDir: string, now = new Date()): string {
        fs.mkdirSync(logsDir, { recursive: true });
        const file = path.join(logsDir, `crash-${now.toISOString().replace(/[:.]/g, "-")}.md`);
        fs.writeFileSync(file, `# ${this.title(details)}\n\n${this.body(details)}\n`);
        return file;
    }
}
