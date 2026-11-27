import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------------
// Where the launcher keeps its own files on this machine (never the user's data).
//
//   <home>/hompag.mjs           the installed launcher (what autostart runs)
//   <home>/settings.json        install mode, release version, repo location
//   <home>/config.json          server config: storePath, port, API keys (machine-local)
//   <home>/releases/<version>/  installed production releases
//   <home>/logs/                daily server logs + crash reports
//   <home>/state/               lock file, build stamps
// ---------------------------------------------------------------------------------
export class AppPaths {
    readonly home: string;

    constructor(home?: string, platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env) {
        this.home = home ?? env.HOMPAG_HOME ?? AppPaths.defaultHome(platform, env);
    }

    static defaultHome(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, homedir = os.homedir()): string {
        switch (platform) {
            case "win32":
                return path.win32.join(env.LOCALAPPDATA ?? path.win32.join(homedir, "AppData", "Local"), "hompag");
            case "darwin":
                return path.posix.join(homedir, "Library", "Application Support", "hompag");
            default:
                return path.posix.join(env.XDG_DATA_HOME ?? path.posix.join(homedir, ".local", "share"), "hompag");
        }
    }

    get launcher() { return path.join(this.home, "hompag.mjs"); }
    get settingsFile() { return path.join(this.home, "settings.json"); }
    get configFile() { return path.join(this.home, "config.json"); }
    get releasesDir() { return path.join(this.home, "releases"); }
    get logsDir() { return path.join(this.home, "logs"); }
    get stateDir() { return path.join(this.home, "state"); }
    get lockFile() { return path.join(this.stateDir, "supervisor.lock"); }
    get buildStampsFile() { return path.join(this.stateDir, "build-stamps.json"); }

    releaseDir(version: string) { return path.join(this.releasesDir, version); }
}
