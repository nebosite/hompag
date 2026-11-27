import { spawn } from "child_process";
import * as fs from "fs";
import { AppPaths } from "./AppPaths";
import { Autostart, AutostartSpec } from "./Autostart";
import { AutostartFactory } from "./AutostartFactory";
import { ControlClient } from "./ControlClient";
import { DevLaunchTarget } from "./DevLaunchTarget";
import { DevWorkspace } from "./DevWorkspace";
import { HealthProbe, HealthResult } from "./HealthProbe";
import { InstallSettings, ServerConfigFile } from "./InstallSettings";
import { JsonFile } from "./JsonFile";
import { LaunchTarget } from "./LaunchTarget";
import { ProdLaunchTarget } from "./ProdLaunchTarget";
import { WindowsAutostart } from "./WindowsAutostart";

// ---------------------------------------------------------------------------------
// hompag as installed on this machine: its settings and config, and the common
// operations the CLI commands share (start, stop, what to launch).
// ---------------------------------------------------------------------------------
export class Installation {
    readonly settingsFile: JsonFile<InstallSettings>;
    readonly configFile: JsonFile<ServerConfigFile>;
    readonly control: ControlClient;
    private _autostart?: Autostart;

    constructor(readonly paths = new AppPaths()) {
        this.settingsFile = new JsonFile<InstallSettings>(paths.settingsFile);
        this.configFile = new JsonFile<ServerConfigFile>(paths.configFile);
        this.control = new ControlClient(paths.lockFile);
    }

    get isInstalled() { return this.settingsFile.exists && this.configFile.exists; }

    settings(): InstallSettings {
        const settings = this.settingsFile.read();
        if (!settings) throw new Error(`hompag is not installed (no ${this.paths.settingsFile}). Run the installer first.`);
        return settings;
    }

    config(): ServerConfigFile {
        const config = this.configFile.read();
        if (!config) throw new Error(`hompag is not configured (no ${this.paths.configFile}). Run "hompag install".`);
        return config;
    }

    get port() { return this.configFile.read()?.port ?? 8101; }
    get homeUrl() { return `http://localhost:${this.port}/home`; }

    /** Secret values in the config, so crash reports can redact them */
    secrets(): string[] {
        const config = this.configFile.read();
        return [config?.spotify?.clientId, config?.spotify?.clientSecret, config?.axios?.apiKey]
            .filter((s): s is string => !!s);
    }

    async autostart(): Promise<Autostart> {
        this._autostart ??= await AutostartFactory.create();
        return this._autostart;
    }

    autostartSpec(nodePath = this.settings().nodePath): AutostartSpec {
        return { nodePath, launcherPath: this.paths.launcher, appHome: this.paths.home, logsDir: this.paths.logsDir };
    }

    // ---------------------------------------------------------------------------------
    // What the supervisor should run
    // ---------------------------------------------------------------------------------
    launchTarget(): LaunchTarget {
        const settings = this.settings();
        if (settings.mode === "dev") {
            if (!settings.repoPath) throw new Error("Developer mode is missing its repository path. Run \"hompag install\" again.");
            const workspace = new DevWorkspace(settings.repoPath, this.paths.buildStampsFile);
            return new DevLaunchTarget(workspace, this.paths.configFile);
        }
        if (!settings.version) throw new Error("No release is installed. Run \"hompag update\" or reinstall.");
        return new ProdLaunchTarget(this.paths.releaseDir(settings.version), settings.version, this.paths.configFile);
    }

    // ---------------------------------------------------------------------------------
    // Start the supervisor in the background (the same way login does, when
    // autostart is registered).  No-op if it's already running.
    // ---------------------------------------------------------------------------------
    async startSupervisor(): Promise<"started" | "alreadyRunning"> {
        if (this.control.supervisor) return "alreadyRunning";
        const settings = this.settings();
        const autostart = await this.autostart();
        if (process.platform === "win32") {
            await new WindowsAutostart().startNow(this.autostartSpec(fs.existsSync(settings.nodePath) ? settings.nodePath : process.execPath));
        } else if (settings.autostart && await autostart.isRegistered()) {
            await autostart.startNow(this.autostartSpec());
        } else {
            const nodePath = fs.existsSync(settings.nodePath) ? settings.nodePath : process.execPath;
            const child = spawn(nodePath, [this.paths.launcher, "run"], { detached: true, stdio: "ignore", windowsHide: true });
            child.on("error", () => {});
            child.unref();
        }
        return "started";
    }

    // ---------------------------------------------------------------------------------
    // Ask the supervisor to stop the server and exit.  Resolves true once it's gone.
    // ---------------------------------------------------------------------------------
    async stopSupervisor(timeoutMs = 20000): Promise<boolean> {
        if (!this.control.supervisor) return true;
        await this.control.stop();
        return this.control.waitForExit(timeoutMs);
    }

    async waitForHealthy(timeoutMs: number): Promise<HealthResult> {
        return new HealthProbe(this.port).waitUntilHealthy(timeoutMs);
    }
}
