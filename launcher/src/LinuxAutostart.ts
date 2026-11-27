import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Autostart, AutostartSpec } from "./Autostart";
import { CommandRunner } from "./CommandRunner";

// ---------------------------------------------------------------------------------
// Linux: a systemd user service when systemd is available (it also restarts the
// supervisor if the supervisor itself dies), otherwise an XDG autostart entry
// that desktop sessions run at login.
// ---------------------------------------------------------------------------------
export class LinuxAutostart implements Autostart {
    static readonly SERVICE = "hompag.service";

    constructor(private useSystemd: boolean, private runner = new CommandRunner(), private home = os.homedir(),
                private env: NodeJS.ProcessEnv = process.env) {}

    // ---------------------------------------------------------------------------------
    // Can we use systemd --user here?
    // ---------------------------------------------------------------------------------
    static async systemdAvailable(runner = new CommandRunner()) {
        return (await runner.run("systemctl", ["--user", "show-environment"])).code === 0;
    }

    get description() {
        return this.useSystemd ? `systemd user service ${LinuxAutostart.SERVICE}` : `XDG autostart entry ${this.desktopPath}`;
    }

    get unitPath() {
        return path.join(this.env.XDG_CONFIG_HOME ?? path.join(this.home, ".config"), "systemd", "user", LinuxAutostart.SERVICE);
    }
    get desktopPath() {
        return path.join(this.env.XDG_CONFIG_HOME ?? path.join(this.home, ".config"), "autostart", "hompag.desktop");
    }

    private static quote(s: string) { return `"${s.replace(/(["\\$`])/g, "\\$1")}"`; }

    static renderUnit(spec: AutostartSpec) {
        const q = LinuxAutostart.quote;
        return `[Unit]
Description=hompag home page server
After=network-online.target

[Service]
ExecStart=${q(spec.nodePath)} ${q(spec.launcherPath)} run
Environment=PATH=${path.dirname(spec.nodePath)}:/usr/local/bin:/usr/bin:/bin
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
`;
    }

    static renderDesktopEntry(spec: AutostartSpec) {
        const q = LinuxAutostart.quote;
        return `[Desktop Entry]
Type=Application
Name=hompag
Comment=hompag home page server
Exec=${q(spec.nodePath)} ${q(spec.launcherPath)} run
Terminal=false
X-GNOME-Autostart-enabled=true
`;
    }

    async register(spec: AutostartSpec) {
        if (this.useSystemd) {
            fs.mkdirSync(path.dirname(this.unitPath), { recursive: true });
            fs.writeFileSync(this.unitPath, LinuxAutostart.renderUnit(spec));
            await this.runner.run("systemctl", ["--user", "daemon-reload"]);
            const result = await this.runner.run("systemctl", ["--user", "enable", LinuxAutostart.SERVICE]);
            if (result.code !== 0) throw new Error(`systemctl enable failed: ${result.stderr.trim()}`);
        } else {
            fs.mkdirSync(path.dirname(this.desktopPath), { recursive: true });
            fs.writeFileSync(this.desktopPath, LinuxAutostart.renderDesktopEntry(spec));
        }
    }

    async unregister() {
        if (fs.existsSync(this.unitPath)) {
            await this.runner.run("systemctl", ["--user", "disable", "--now", LinuxAutostart.SERVICE]);
            fs.unlinkSync(this.unitPath);
            await this.runner.run("systemctl", ["--user", "daemon-reload"]);
        }
        if (fs.existsSync(this.desktopPath)) fs.unlinkSync(this.desktopPath);
    }

    async isRegistered() {
        return this.useSystemd ? fs.existsSync(this.unitPath) : fs.existsSync(this.desktopPath);
    }

    async startNow(spec: AutostartSpec) {
        if (this.useSystemd) {
            await this.runner.run("systemctl", ["--user", "start", LinuxAutostart.SERVICE]);
        } else {
            const child = spawn(spec.nodePath, [spec.launcherPath, "run"], { detached: true, stdio: "ignore" });
            child.on("error", () => {});
            child.unref();
        }
    }
}
