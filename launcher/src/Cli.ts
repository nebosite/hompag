import * as fs from "fs";
import * as os from "os";
import { BrowserOpener } from "./BrowserOpener";
import { CrashReporter } from "./CrashReporter";
import { Installation } from "./Installation";
import { Installer, InstallOptions } from "./Installer";
import { LogSink } from "./LogSink";
import { Prompter } from "./Prompter";
import { SupervisorHost } from "./SupervisorHost";

export interface ParsedArgs {
    command: string
    flags: { [name: string]: string | boolean }
}

const HELP = `hompag - your local, self-hosted browser home page

Usage: hompag <command> [options]

Commands:
  install      Install or reconfigure hompag (safe to re-run)
                 --mode prod|dev        production release or developer checkout
                 --data <folder>        where your pages are stored (ideally cloud-synced)
                 --port <n>             port to serve on (default 8101)
                 --version <tag>        prod: release to install (default: latest)
                 --from-source <repo>   prod: install the release built in <repo>/release
                 --repo-dir <folder>    dev: where the source checkout lives
                 --clone direct|fork    dev: clone the main repo or fork it first
                 --no-autostart         don't start hompag at login
                 --no-start             don't start hompag now
                 --no-path              don't add the "hompag" command to your PATH
                 --yes                  accept defaults; never prompt
  start        Start hompag in the background
  stop         Stop hompag
  restart      Stop and start hompag (developer mode: pulls and rebuilds)
  status       Show whether hompag is running
  logs [-n N]  Show the last N log lines (default 50)
  open         Open your home page in the browser
  report       Open a prefilled GitHub issue with recent logs
  update       Install the latest release (developer mode: restart)
  uninstall    Remove hompag from this computer (your pages are kept)
  run          Run the supervisor in the foreground (what autostart uses)
  version      Show the launcher version
`;

// ---------------------------------------------------------------------------------
// Parses the command line and runs the command
// ---------------------------------------------------------------------------------
export class Cli {
    constructor(private launcherVersion: string, private installation = new Installation()) {}

    static parse(argv: string[]): ParsedArgs {
        const flags: { [name: string]: string | boolean } = {};
        const positional: string[] = [];
        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];
            if (arg.startsWith("--")) {
                const body = arg.slice(2);
                const eq = body.indexOf("=");
                if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1);
                else if (body.startsWith("no-")) flags[body.slice(3)] = false;
                else if (i + 1 < argv.length && !argv[i + 1].startsWith("-") && Cli.takesValue(body)) flags[body] = argv[++i];
                else flags[body] = true;
            } else if (arg === "-n" && i + 1 < argv.length) {
                flags.n = argv[++i];
            } else if (arg === "-y") {
                flags.yes = true;
            } else if (arg === "-h") {
                flags.help = true;
            } else {
                positional.push(arg);
            }
        }
        return { command: positional[0] ?? (flags.version === true ? "version" : "help"), flags };
    }

    private static takesValue(flag: string) {
        return ["mode", "data", "port", "version", "from-source", "repo-dir", "clone", "n"].includes(flag);
    }

    static installOptions(flags: ParsedArgs["flags"]): InstallOptions {
        const str = (name: string) => typeof flags[name] === "string" ? flags[name] as string : undefined;
        const mode = str("mode");
        if (mode && mode !== "prod" && mode !== "dev") throw new Error("--mode must be 'prod' or 'dev'");
        const clone = str("clone");
        if (clone && clone !== "direct" && clone !== "fork") throw new Error("--clone must be 'direct' or 'fork'");
        const port = str("port");
        if (port && !/^\d+$/.test(port)) throw new Error("--port must be a number");
        return {
            mode: mode as InstallOptions["mode"],
            data: str("data"),
            port: port ? Number(port) : undefined,
            version: str("version"),
            fromSource: str("from-source"),
            repoDir: str("repo-dir"),
            clone: clone as InstallOptions["clone"],
            autostart: flags.autostart !== false,
            start: flags.start !== false,
            commandShim: flags.path !== false,
        };
    }

    async run(argv: string[]): Promise<number> {
        const { command, flags } = Cli.parse(argv);
        if (flags.help) { process.stdout.write(HELP); return 0; }

        const prompt = new Prompter(flags.yes ? false : !!process.stdin.isTTY);
        const installer = () => new Installer(this.installation, prompt, this.launcherVersion);
        try {
            switch (command) {
                case "install": return await installer().install(Cli.installOptions(flags));
                case "run": return await new SupervisorHost(this.installation, this.launcherVersion, !!process.stdout.isTTY).run();
                case "start": return await this.start(installer());
                case "stop": return await this.stop();
                case "restart": {
                    if (!await this.installation.stopSupervisor()) { console.log("hompag did not stop."); return 1; }
                    return await this.start(installer());
                }
                case "status": return await this.status();
                case "logs": return this.logs(Number(flags.n ?? 50));
                case "open": return this.open();
                case "report": return this.report();
                case "update": return await installer().update(typeof flags.version === "string" ? flags.version : undefined);
                case "uninstall": return await installer().uninstall();
                case "version": console.log(this.launcherVersion); return 0;
                case "help": process.stdout.write(HELP); return 0;
                default:
                    console.error(`Unknown command '${command}'.\n`);
                    process.stdout.write(HELP);
                    return 2;
            }
        } catch (err) {
            console.error(`Error: ${(err as Error).message}`);
            return 1;
        } finally {
            prompt.close();
        }
    }

    private async start(installer: Installer) {
        if (this.installation.control.supervisor) {
            console.log(`hompag is already running: ${this.installation.homeUrl}`);
            return 0;
        }
        const settings = this.installation.settings();
        return await installer.startAndWait(settings.mode === "dev" ? 600 : 90) ? 0 : 1;
    }

    private async stop() {
        if (!this.installation.control.supervisor) { console.log("hompag is not running."); return 0; }
        const stopped = await this.installation.stopSupervisor();
        console.log(stopped ? "hompag stopped." : "hompag did not stop in time.");
        return stopped ? 0 : 1;
    }

    private async status() {
        const settings = this.installation.settings();
        const config = this.installation.config();
        const autostart = await this.installation.autostart();
        const status = await this.installation.control.status();
        const line = (label: string, value: string) => console.log(`${(label + ":").padEnd(14)}${value}`);

        if (status) {
            const uptime = status.serverStartedAt ? ` for ${Cli.duration(Date.now() - status.serverStartedAt)}` : "";
            line("State", `${status.state}${status.state === "running" ? uptime : ""} - ${status.message}`);
            line("Version", `${status.hompagVersion} (${status.mode} mode)`);
            if (status.crashCount) line("Crashes", `${status.crashCount} recently`);
            if (status.reportFile) line("Crash report", status.reportFile);
        } else {
            line("State", "not running");
            line("Version", `${settings.mode === "prod" ? settings.version : "source"} (${settings.mode} mode)`);
        }
        line("Home page", this.installation.homeUrl);
        line("Data folder", config.storePath);
        if (settings.repoPath) line("Source", settings.repoPath);
        line("Autostart", await autostart.isRegistered() ? autostart.description : "off");
        line("Logs", this.installation.paths.logsDir);
        if (!fs.existsSync(settings.nodePath)) {
            console.log(`\nWARNING: autostart uses ${settings.nodePath}, which no longer exists. Run "hompag install" to fix.`);
        }
        return 0;
    }

    private logs(count: number) {
        const { file, lines } = LogSink.readLatest(this.installation.paths.logsDir, count);
        if (!file) { console.log("No logs yet."); return 0; }
        console.log(`--- ${file}`);
        for (const line of lines) console.log(line);
        return 0;
    }

    private open() {
        new BrowserOpener().open(this.installation.homeUrl);
        console.log(`Opening ${this.installation.homeUrl}`);
        return 0;
    }

    private report() {
        const settings = this.installation.settingsFile.read();
        const { lines } = LogSink.readLatest(this.installation.paths.logsDir, 150);
        const url = new CrashReporter("nebosite/hompag", this.installation.secrets(), os.homedir()).issueUrl({
            reason: "Problem report",
            hompagVersion: settings?.version ?? "source",
            launcherVersion: this.launcherVersion,
            mode: settings?.mode ?? "unknown",
            platform: `${os.platform()} ${os.release()} ${os.arch()}`,
            nodeVersion: process.version,
            crashTimes: [],
            logTail: lines,
        });
        new BrowserOpener().open(url);
        console.log("Opened a prefilled GitHub issue in your browser. Review it, then submit.");
        return 0;
    }

    static duration(ms: number) {
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
        return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`;
    }
}

