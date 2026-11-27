import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CommandRunner } from "./CommandRunner";

// ---------------------------------------------------------------------------------
// Puts a "hompag" command on the user's PATH so they can run "hompag status",
// "hompag restart", etc. from any terminal.
//   Windows:      <app home>\bin\hompag.cmd, with that folder added to the user PATH
//   macOS/Linux:  ~/.local/bin/hompag
// ---------------------------------------------------------------------------------
export class CommandShim {
    constructor(private appHome: string, private platform: NodeJS.Platform = process.platform,
                private runner = new CommandRunner(), private home = os.homedir()) {}

    get binDir() {
        return this.platform === "win32" ? path.join(this.appHome, "bin") : path.join(this.home, ".local", "bin");
    }
    get shimPath() {
        return path.join(this.binDir, this.platform === "win32" ? "hompag.cmd" : "hompag");
    }

    static render(platform: NodeJS.Platform, nodePath: string, launcherPath: string) {
        return platform === "win32"
            ? `@echo off\r\n"${nodePath}" "${launcherPath}" %*\r\n`
            : `#!/bin/sh\nexec "${nodePath}" "${launcherPath}" "$@"\n`;
    }

    // ---------------------------------------------------------------------------------
    // Returns a hint for the user if the command won't be found right away
    // ---------------------------------------------------------------------------------
    async install(nodePath: string, launcherPath: string): Promise<string | undefined> {
        fs.mkdirSync(this.binDir, { recursive: true });
        fs.writeFileSync(this.shimPath, CommandShim.render(this.platform, nodePath, launcherPath), { mode: 0o755 });

        if (this.platform === "win32") {
            const userPath = await this.windowsUserPath();
            const entries = userPath.split(";").map(p => p.trim().toLowerCase().replace(/\\$/, ""));
            if (!entries.includes(this.binDir.toLowerCase())) {
                await this.setWindowsUserPath(userPath ? `${userPath.replace(/;$/, "")};${this.binDir}` : this.binDir);
                return "Open a new terminal to use the 'hompag' command.";
            }
            return undefined;
        }
        const onPath = (process.env.PATH ?? "").split(":").includes(this.binDir);
        return onPath ? undefined : `Add ${this.binDir} to your PATH to use the 'hompag' command.`;
    }

    async remove() {
        fs.rmSync(this.shimPath, { force: true });
        if (this.platform === "win32") {
            const userPath = await this.windowsUserPath();
            const kept = userPath.split(";").filter(p => p && p.toLowerCase().replace(/\\$/, "") !== this.binDir.toLowerCase());
            if (kept.join(";") !== userPath) await this.setWindowsUserPath(kept.join(";"));
        }
    }

    // The user PATH lives in the registry; PowerShell reads/writes it without
    // the 1024-character truncation that setx has.
    private async windowsUserPath(): Promise<string> {
        const result = await this.runner.run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
            "[Environment]::GetEnvironmentVariable('Path','User')"]);
        return result.code === 0 ? result.stdout.trim() : "";
    }

    private async setWindowsUserPath(value: string) {
        const result = await this.runner.run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
            "[Environment]::SetEnvironmentVariable('Path', [Console]::In.ReadToEnd().Trim(), 'User')"], { input: value });
        if (result.code !== 0) throw new Error(`Could not update your PATH: ${result.stderr.trim()}`);
    }
}
