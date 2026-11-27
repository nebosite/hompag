import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { CommandShim } from "./CommandShim";
import { DataFolderAdvisor } from "./DataFolderAdvisor";
import { DevWorkspace } from "./DevWorkspace";
import { Installation } from "./Installation";
import { LegacyAutostart } from "./LegacyAutostart";
import { InstallSettings, ServerConfigFile } from "./InstallSettings";
import { Prerequisites } from "./Prerequisites";
import { Choice, Prompter } from "./Prompter";
import { ReleaseFetcher } from "./ReleaseFetcher";

export interface InstallOptions {
    mode?: "prod" | "dev"
    data?: string
    port?: number
    /** prod: release tag to install (default: latest) */
    version?: string
    /** prod: install the release assembled in <repo>/release instead of downloading */
    fromSource?: string
    /** dev: where the git checkout lives */
    repoDir?: string
    /** dev: "direct" clone or "fork" (default: ask, based on access) */
    clone?: "direct" | "fork"
    autostart: boolean
    /** Put a "hompag" command on the PATH */
    commandShim: boolean
    start: boolean
}

// ---------------------------------------------------------------------------------
// The install, update, and uninstall flows.  Safe to re-run: an existing install
// supplies the defaults, so running it again repairs or reconfigures in place.
// ---------------------------------------------------------------------------------
export class Installer {
    constructor(
        private installation: Installation,
        private prompt: Prompter,
        private launcherVersion: string,
        private prerequisites = new Prerequisites(),
        private advisor = new DataFolderAdvisor()) {}

    private get paths() { return this.installation.paths; }
    private say(text = "") { this.prompt.say(text); }

    // ---------------------------------------------------------------------------------
    // Full install
    // ---------------------------------------------------------------------------------
    async install(options: InstallOptions): Promise<number> {
        const nodeProblem = this.prerequisites.checkNode();
        if (nodeProblem) { this.say(nodeProblem); return 1; }

        const existingSettings = this.installation.settingsFile.read();
        const existingConfig = this.installation.configFile.read();

        this.say(`hompag installer (launcher ${this.launcherVersion})`);
        this.say("=".repeat(40));
        if (existingSettings) {
            this.say(`hompag is already installed here (${existingSettings.mode} mode). Continuing will update and repair it;`);
            this.say("your existing choices are offered as the defaults.");
        }
        this.say();

        // 1. Mode
        const mode = options.mode ?? await this.prompt.choose<"prod" | "dev">("How do you want to run hompag?", [
            { label: "Production", value: "prod", detail: "Downloads a ready-made release. Best for most people." },
            { label: "Developer", value: "dev", detail: "Clones the source (or your fork) and builds it on each start. For working on hompag." },
        ], existingSettings?.mode === "dev" ? 1 : 0);

        if (mode === "dev") {
            const gitProblem = await this.prerequisites.checkGit();
            if (gitProblem) { this.say(gitProblem); return 1; }
        }

        // 2. Data folder
        this.say();
        const storePath = options.data ? path.resolve(options.data) : await this.chooseDataFolder(existingConfig?.storePath);
        if (!await this.confirmDataFolder(storePath)) return 1;

        // 3. Config (port + optional API keys)
        const config: ServerConfigFile = {
            ...existingConfig,
            storePath,
            port: options.port ?? existingConfig?.port ?? 8101,
        };
        await this.askForApiKeys(config);

        // 4. Stop a running copy before replacing anything
        if (this.installation.control.supervisor) {
            this.say("Stopping the running hompag...");
            if (!await this.installation.stopSupervisor()) {
                this.say("The running hompag did not stop. Close it and try again.");
                return 1;
            }
        }
        fs.mkdirSync(this.paths.home, { recursive: true });
        this.installation.configFile.write(config, 0o600);

        // 5. The code
        const settings: InstallSettings = {
            mode,
            nodePath: process.execPath,
            autostart: options.autostart,
            installedAt: new Date().toISOString(),
            repoPath: existingSettings?.repoPath,
            version: existingSettings?.version,
            previousVersion: existingSettings?.previousVersion,
        };
        let launcherSource = Installer.runningLauncher();
        this.say();
        if (mode === "prod") {
            const releaseDir = await this.installRelease(settings, options);
            const bundled = path.join(releaseDir, "hompag.mjs");
            if (fs.existsSync(bundled)) launcherSource = bundled;
        } else {
            const ok = await this.installSource(settings, options);
            if (!ok) return 1;
        }

        // 6. The launcher, the "hompag" command, and autostart
        if (path.resolve(launcherSource) !== path.resolve(this.paths.launcher)) {
            fs.copyFileSync(launcherSource, this.paths.launcher);
        }
        this.installation.settingsFile.write(settings);

        const shimHint = !options.commandShim ? undefined : await new CommandShim(this.paths.home).install(settings.nodePath, this.paths.launcher)
            .catch(err => `Could not add the 'hompag' command: ${err.message}`);

        const autostart = await this.installation.autostart();
        if (options.autostart) {
            await autostart.register(this.installation.autostartSpec(settings.nodePath));
            this.say(`hompag will start automatically when you log in (${autostart.description}).`);
            await this.retireLegacyAutostart();
        } else {
            await autostart.unregister();
            this.say("Autostart is off. Run 'hompag start' to start hompag.");
        }

        // 7. Start it and make sure it works
        if (options.start) {
            const healthy = await this.startAndWait(mode === "dev" ? 600 : 90);
            if (!healthy) return 1;
        }

        this.say();
        this.say("Done!");
        this.say(`  Your home page:   ${this.installation.homeUrl}`);
        this.say(`  Your data:        ${storePath}`);
        this.say(`  Settings & logs:  ${this.paths.home}`);
        this.say("  Commands:         hompag status | start | stop | restart | logs | update | uninstall");
        if (shimHint) this.say(`  Note: ${shimHint}`);
        this.say();
        this.say("Set this address as your browser's home page and new tab page to see it everywhere.");
        this.say("Any page name works: /home, /work, /recipes ... each one is its own page.");
        return 0;
    }

    // ---------------------------------------------------------------------------------
    // Turn off a hand-made startup task from the old README instructions, which
    // would otherwise race the new autostart for the same port
    // ---------------------------------------------------------------------------------
    private async retireLegacyAutostart() {
        const legacy = new LegacyAutostart();
        for (const task of await legacy.findTasks()) {
            this.say(`Found an older hompag startup task in Task Scheduler: "${task}" (runs hompagserver.vbs).`);
            if (await this.prompt.confirm("Disable it so it doesn't compete with the new autostart? (You can re-enable it in Task Scheduler.)", true)) {
                this.say(await legacy.disable(task) ? `Disabled "${task}".` : `Could not disable "${task}"; please disable it in Task Scheduler.`);
            }
        }
    }

    // ---------------------------------------------------------------------------------
    // Explain the choice and offer cloud folders first
    // ---------------------------------------------------------------------------------
    private async chooseDataFolder(existing?: string): Promise<string> {
        const clouds = this.advisor.detectCloudFolders();
        this.say("Where should hompag keep your pages?");
        this.say("  To see the same page on all your computers, pick a folder that a cloud service");
        this.say("  (OneDrive, Dropbox, Google Drive, iCloud...) syncs, and choose the same folder on");
        this.say("  each machine. hompag notices when synced changes arrive.");
        this.say();

        const choices: Choice<string | undefined>[] = [];
        if (existing) choices.push({ label: `Keep the current folder: ${existing}`, value: existing });
        for (const cloud of clouds) {
            const suggested = this.advisor.suggestedPath(cloud);
            if (suggested !== existing) choices.push({ label: `${cloud.provider}: ${suggested}`, value: suggested });
        }
        if (this.advisor.localDefault !== existing) {
            choices.push({ label: `This computer only: ${this.advisor.localDefault}`, value: this.advisor.localDefault,
                detail: "Not synced. Your page will only be on this computer." });
        }
        choices.push({ label: "Somewhere else...", value: undefined });

        const choice = await this.prompt.choose("Data folder:", choices, 0);
        if (choice) return choice;
        return path.resolve(await this.prompt.ask("Folder path", undefined, "--data <folder>"));
    }

    private async confirmDataFolder(folder: string): Promise<boolean> {
        const inspection = this.advisor.inspect(folder);
        if (inspection.hasHompagData) {
            this.say(`Found existing hompag pages in ${folder}. This computer will share them.`);
        } else if (inspection.hasOtherFiles) {
            const ok = await this.prompt.confirm(`${folder} already has other files in it. hompag will add its own folders there. Use it anyway?`, true);
            if (!ok) return false;
        }
        const problem = DataFolderAdvisor.ensureWritable(folder);
        if (problem) { this.say(problem); return false; }
        const cloud = this.advisor.isCloudSynced(folder);
        this.say(cloud
            ? `Data folder: ${folder} (synced by ${cloud.provider})`
            : `Data folder: ${folder} (not in a cloud-synced folder; your page will only be on this computer)`);
        return true;
    }

    private async askForApiKeys(config: ServerConfigFile) {
        if (!this.prompt.interactive) return;
        const hasKeys = !!(config.spotify?.clientId || config.axios?.apiKey);
        this.say();
        if (!await this.prompt.confirm(hasKeys
            ? "Change the API keys for the Spotify and stock widgets?"
            : "Set up API keys for the optional Spotify and stock widgets now? (you can do this later)", false)) return;
        this.say("Spotify: create an app at https://developer.spotify.com/dashboard with redirect URL");
        this.say(`  http://localhost:${config.port}/api/loginresponder/spotify`);
        config.spotify = {
            clientId: await this.prompt.ask("Spotify client id (blank to skip)", config.spotify?.clientId ?? ""),
            clientSecret: await this.prompt.ask("Spotify client secret", config.spotify?.clientSecret ?? ""),
        };
        this.say("Stocks: get a free Twelve Data key at https://rapidapi.com/twelvedata/api/twelve-data1");
        config.axios = { apiKey: await this.prompt.ask("Stock API key (blank to skip)", config.axios?.apiKey ?? "") };
    }

    // ---------------------------------------------------------------------------------
    // Production: download (or copy) a release into releases/<version>
    // ---------------------------------------------------------------------------------
    private async installRelease(settings: InstallSettings, options: InstallOptions): Promise<string> {
        const fetcher = new ReleaseFetcher(this.paths.releasesDir, "nebosite/hompag", undefined, (line) => this.say(line));
        let version: string;
        let releaseDir: string;
        if (options.fromSource) {
            const built = Installer.findLocalRelease(options.fromSource);
            version = built.version;
            this.say(`Installing hompag ${version} from ${built.dir}...`);
            releaseDir = fetcher.installFromFolder(built.dir, version);
        } else {
            const release = await fetcher.find(options.version);
            version = release.version;
            releaseDir = await fetcher.install(release);
        }
        if (settings.version && settings.version !== version) settings.previousVersion = settings.version;
        settings.version = version;
        fetcher.prune([settings.version, settings.previousVersion]);
        this.say(`hompag ${version} is installed.`);
        return releaseDir;
    }

    static findLocalRelease(repoDir: string): { dir: string, version: string } {
        const releaseRoot = path.join(path.resolve(repoDir), "release");
        const folder = fs.existsSync(releaseRoot)
            ? fs.readdirSync(releaseRoot).find(n => /^hompag-.+$/.test(n) && fs.statSync(path.join(releaseRoot, n)).isDirectory())
            : undefined;
        if (!folder) {
            throw new Error(`No release found in ${releaseRoot}. Build one first:\n`
                + `  node build-all.js && node scripts/package-release.mjs`);
        }
        return { dir: path.join(releaseRoot, folder), version: folder.replace(/^hompag-/, "") };
    }

    // ---------------------------------------------------------------------------------
    // Developer: get the source and do the first build
    // ---------------------------------------------------------------------------------
    private async installSource(settings: InstallSettings, options: InstallOptions): Promise<boolean> {
        const defaultRepo = options.repoDir ?? settings.repoPath ?? Installer.checkoutContaining(process.cwd())
            ?? path.join(os.homedir(), "hompag");
        const repoDir = path.resolve(options.repoDir ?? await this.prompt.ask("Where should the hompag source live?", defaultRepo, "--repo-dir <folder>"));

        if (!fs.existsSync(path.join(repoDir, ".git"))) {
            let how = options.clone;
            if (!how) {
                const canPush = await DevWorkspace.canPushUpstream();
                if (canPush === true) {
                    how = "direct";
                } else if (canPush === false) {
                    how = await this.prompt.choose<"direct" | "fork">("You don't have push access to nebosite/hompag.", [
                        { label: "Fork it to my GitHub account and clone the fork", value: "fork", detail: "Lets you push changes and open pull requests." },
                        { label: "Just clone it (read-only)", value: "direct" },
                    ]);
                } else {
                    this.say("Tip: install and sign in to the GitHub CLI (gh) to have the installer fork the repo for you.");
                    how = "direct";
                }
            }
            await DevWorkspace.clone(repoDir, how, (line) => this.say(line));
        }

        settings.repoPath = repoDir;
        settings.version = undefined;
        this.say("Building hompag (the first build takes a few minutes)...");
        const result = await new DevWorkspace(repoDir, this.paths.buildStampsFile).build((line) => this.say(line));
        if (result.warning) this.say(`WARNING: ${result.warning}`);
        if (!result.ok) { this.say(result.error ?? "The build failed."); return false; }
        return true;
    }

    /** The hompag checkout that contains folder, if any */
    static checkoutContaining(folder: string): string | undefined {
        for (let dir = path.resolve(folder); ; dir = path.dirname(dir)) {
            if (["common", "clientapp", "webserver"].every(p => fs.existsSync(path.join(dir, p, "package.json")))
                && fs.existsSync(path.join(dir, ".git"))) return dir;
            if (path.dirname(dir) === dir) return undefined;
        }
    }

    static runningLauncher() { return fileURLToPath(import.meta.url); }

    // ---------------------------------------------------------------------------------
    // Start the supervisor and wait for the server to answer
    // ---------------------------------------------------------------------------------
    async startAndWait(timeoutSeconds: number): Promise<boolean> {
        this.say("Starting hompag...");
        await this.installation.startSupervisor();
        const startedAt = Date.now();
        const deadline = startedAt + timeoutSeconds * 1000;
        let lastError = "not checked";
        while (Date.now() < deadline) {
            const health = await this.installation.waitForHealthy(1000);
            if (health.ok) {
                this.say(`hompag ${health.version} is running.`);
                return true;
            }
            lastError = health.error ?? lastError;

            // Don't sit out the whole timeout if the supervisor already gave up
            const status = await this.installation.control.status();
            if (status?.state === "gaveUp") {
                this.say(`hompag could not start: ${status.message}`);
                if (status.reportFile) this.say(`Crash report: ${status.reportFile}`);
                this.say(`Details: http://localhost:${this.installation.port}/ or 'hompag logs'`);
                return false;
            }
            if (!this.installation.control.supervisor && Date.now() - startedAt > 15000) {
                this.say(`The hompag supervisor exited. See 'hompag logs' (${this.paths.logsDir}).`);
                return false;
            }
        }
        this.say(`hompag did not start within ${timeoutSeconds}s (${lastError}).`);
        this.say(`Check http://localhost:${this.installation.port}/ or the logs in ${this.paths.logsDir}`);
        return false;
    }

    // ---------------------------------------------------------------------------------
    // Production: move to the latest (or given) release.  Developer mode just
    // restarts, since every start pulls and rebuilds.
    // ---------------------------------------------------------------------------------
    async update(tag?: string): Promise<number> {
        const settings = this.installation.settings();
        if (settings.mode === "prod") {
            const fetcher = new ReleaseFetcher(this.paths.releasesDir, "nebosite/hompag", undefined, (line) => this.say(line));
            const release = await fetcher.find(tag);
            if (release.version === settings.version) {
                this.say(`hompag ${release.version} is already the installed version.`);
                return 0;
            }
            await fetcher.install(release);
            const launcher = await fetcher.downloadLauncher(release);
            await this.installation.stopSupervisor();
            if (launcher) fs.writeFileSync(this.paths.launcher, launcher);
            settings.previousVersion = settings.version;
            settings.version = release.version;
            this.installation.settingsFile.write(settings);
            fetcher.prune([settings.version, settings.previousVersion]);
            this.say(`Updated to hompag ${release.version}.`);
        } else {
            this.say("Developer mode: restarting, which pulls and rebuilds.");
            await this.installation.stopSupervisor();
        }
        return await this.startAndWait(settings.mode === "dev" ? 600 : 90) ? 0 : 1;
    }

    // ---------------------------------------------------------------------------------
    // Remove everything except the user's data (and a developer's checkout)
    // ---------------------------------------------------------------------------------
    async uninstall(): Promise<number> {
        const config = this.installation.configFile.read();
        const settings = this.installation.settingsFile.read();
        if (!await this.prompt.confirm("Uninstall hompag from this computer? Your pages are kept.", !this.prompt.interactive)) {
            this.say("Nothing was changed.");
            return 1;
        }
        await this.installation.stopSupervisor();
        await (await this.installation.autostart()).unregister();
        await new CommandShim(this.paths.home).remove().catch(() => {});
        fs.rmSync(this.paths.home, { recursive: true, force: true });
        this.say("hompag has been uninstalled.");
        if (config?.storePath) this.say(`Your pages are still in ${config.storePath}`);
        if (settings?.repoPath) this.say(`Your source checkout is still in ${settings.repoPath}`);
        return 0;
    }
}
