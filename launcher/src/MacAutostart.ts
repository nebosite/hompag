import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Autostart, AutostartSpec } from "./Autostart";
import { CommandRunner } from "./CommandRunner";

// ---------------------------------------------------------------------------------
// macOS: a per-user LaunchAgent.  launchd also restarts the supervisor if the
// supervisor itself ever dies unexpectedly (KeepAlive on unsuccessful exit).
// ---------------------------------------------------------------------------------
export class MacAutostart implements Autostart {
    static readonly LABEL = "com.nebosite.hompag";
    readonly description = `LaunchAgent ${MacAutostart.LABEL}`;

    constructor(private runner = new CommandRunner(), private home = os.homedir(), private uid = process.getuid?.() ?? 501) {}

    get plistPath() { return path.join(this.home, "Library", "LaunchAgents", `${MacAutostart.LABEL}.plist`); }
    private get domain() { return `gui/${this.uid}`; }

    static renderPlist(spec: AutostartSpec) {
        const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const pathEnv = [path.dirname(spec.nodePath), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${MacAutostart.LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${x(spec.nodePath)}</string>
        <string>${x(spec.launcherPath)}</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${x(pathEnv)}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${x(path.join(spec.logsDir, "launchd.log"))}</string>
    <key>StandardErrorPath</key>
    <string>${x(path.join(spec.logsDir, "launchd.log"))}</string>
</dict>
</plist>
`;
    }

    async register(spec: AutostartSpec) {
        fs.mkdirSync(path.dirname(this.plistPath), { recursive: true });
        fs.writeFileSync(this.plistPath, MacAutostart.renderPlist(spec));
        // Reload so launchd sees the new definition.  bootout fails harmlessly if not loaded.
        await this.runner.run("launchctl", ["bootout", `${this.domain}/${MacAutostart.LABEL}`]);
        const result = await this.runner.run("launchctl", ["bootstrap", this.domain, this.plistPath]);
        if (result.code !== 0) throw new Error(`launchctl bootstrap failed: ${result.stderr.trim()}`);
    }

    async unregister() {
        await this.runner.run("launchctl", ["bootout", `${this.domain}/${MacAutostart.LABEL}`]);
        if (fs.existsSync(this.plistPath)) fs.unlinkSync(this.plistPath);
    }

    async isRegistered() {
        return fs.existsSync(this.plistPath);
    }

    async startNow() {
        await this.runner.run("launchctl", ["kickstart", `${this.domain}/${MacAutostart.LABEL}`]);
    }
}
