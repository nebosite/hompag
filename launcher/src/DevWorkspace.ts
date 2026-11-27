import * as fs from "fs";
import * as path from "path";
import { BuildStamp, PackageStamp } from "./BuildStamp";
import { CommandRunner } from "./CommandRunner";
import { JsonFile } from "./JsonFile";
import { PrepareResult } from "./LaunchTarget";

export type PackageName = "common" | "clientapp" | "webserver";
type Stamps = { [pkg: string]: PackageStamp };

export interface PackageState {
    stamp: PackageStamp
    previous?: PackageStamp
    hasNodeModules: boolean
    hasOutput: boolean
}

export interface BuildStep {
    pkg: PackageName
    install: boolean
    build: boolean
}

// ---------------------------------------------------------------------------------
// A developer's git checkout of hompag: clone or fork it, keep it up to date,
// and rebuild only the packages that changed.
// ---------------------------------------------------------------------------------
export class DevWorkspace {
    static readonly UPSTREAM = "nebosite/hompag";
    static readonly PACKAGES: PackageName[] = ["common", "clientapp", "webserver"];

    private stamps: JsonFile<Stamps>;

    constructor(readonly repoDir: string, stampsFile: string, private runner = new CommandRunner()) {
        this.stamps = new JsonFile<Stamps>(stampsFile);
    }

    // ---------------------------------------------------------------------------------
    // Does the signed-in GitHub CLI user have push access to the main repo?
    // undefined if gh isn't installed or signed in.
    // ---------------------------------------------------------------------------------
    static async canPushUpstream(runner = new CommandRunner()): Promise<boolean | undefined> {
        const result = await runner.run("gh", ["api", `repos/${DevWorkspace.UPSTREAM}`, "--jq", ".permissions.push"]);
        if (result.code !== 0) return undefined;
        return result.stdout.trim() === "true";
    }

    // ---------------------------------------------------------------------------------
    // Get the source.  "fork" makes (or reuses) a fork under the user's GitHub
    // account and clones it, with the main repo as the "upstream" remote.
    // ---------------------------------------------------------------------------------
    static async clone(targetDir: string, how: "direct" | "fork", log: (line: string) => void, runner = new CommandRunner()) {
        if (fs.existsSync(path.join(targetDir, ".git"))) {
            log(`Using the existing checkout at ${targetDir}`);
            return;
        }
        if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
            throw new Error(`${targetDir} already exists and is not empty. Choose another folder.`);
        }
        const parent = path.dirname(targetDir);
        fs.mkdirSync(parent, { recursive: true });
        const onLine = (line: string) => log(line);

        if (how === "fork") {
            log(`Forking ${DevWorkspace.UPSTREAM} to your GitHub account...`);
            const fork = await runner.run("gh", ["repo", "fork", DevWorkspace.UPSTREAM, "--clone=false"], { onLine });
            if (fork.code !== 0) throw new Error(`gh repo fork failed: ${fork.stderr.trim()}`);
            const login = (await runner.run("gh", ["api", "user", "--jq", ".login"])).stdout.trim();
            if (!login) throw new Error("Could not determine your GitHub user name from gh.");
            const forkName = `${login}/${DevWorkspace.UPSTREAM.split("/")[1]}`;

            log(`Cloning https://github.com/${forkName}.git ...`);
            const clone = await runner.run("git", ["clone", `https://github.com/${forkName}.git`, targetDir], { onLine });
            if (clone.code !== 0) throw new Error(`git clone of your fork failed: ${clone.stderr.trim()}`);
            await runner.run("git", ["remote", "add", "upstream", `https://github.com/${DevWorkspace.UPSTREAM}.git`], { cwd: targetDir });
            log(`Added remote "upstream" -> ${DevWorkspace.UPSTREAM}`);
        } else {
            log(`Cloning https://github.com/${DevWorkspace.UPSTREAM}.git ...`);
            const result = await runner.run("git", ["clone", `https://github.com/${DevWorkspace.UPSTREAM}.git`, targetDir], { onLine });
            if (result.code !== 0) throw new Error(`git clone failed: ${result.stderr.trim()}`);
        }
    }

    get version(): string {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.repoDir, "webserver", "package.json"), "utf8")).version + "-dev";
        } catch {
            return "dev";
        }
    }

    // ---------------------------------------------------------------------------------
    // Fast-forward to the latest upstream, but only when that can't disturb the
    // developer's work: clean tree, branch with an upstream.  Never fatal.
    // ---------------------------------------------------------------------------------
    async pull(log: (line: string) => void) {
        const git = (args: string[]) => this.runner.run("git", args, { cwd: this.repoDir });
        const status = await git(["status", "--porcelain"]);
        if (status.code !== 0) { log(`Skipping git pull: ${status.stderr.trim()}`); return; }
        if (status.stdout.trim() !== "") { log("Skipping git pull: you have uncommitted changes."); return; }
        const upstream = await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
        if (upstream.code !== 0) { log("Skipping git pull: this branch has no upstream."); return; }

        log(`Pulling from ${upstream.stdout.trim()}...`);
        const pull = await git(["pull", "--ff-only"]);
        if (pull.code !== 0) log(`git pull failed (continuing with the local code): ${pull.stderr.trim()}`);
        else log(pull.stdout.trim().split(/\r?\n/).pop() ?? "Up to date.");
    }

    // ---------------------------------------------------------------------------------
    // Decide what to (re)install and (re)build.  Pure, for testing.
    // ---------------------------------------------------------------------------------
    static planBuild(states: { [pkg in PackageName]: PackageState }, force = false): BuildStep[] {
        const changed = (s: PackageState, key: keyof PackageStamp) => !s.previous || s.previous[key] !== s.stamp[key];
        // With no record yet (an existing checkout adopted for the first time), trust
        // the node_modules that are there; reinstall only when a lock file changes.
        const lockChanged = (s: PackageState) => !!s.previous && s.previous.lock !== s.stamp.lock;
        const steps: BuildStep[] = [];

        const common = states.common;
        const commonInstall = force || !common.hasNodeModules || lockChanged(common);
        const commonBuild = commonInstall || !common.hasOutput || changed(common, "source");
        steps.push({ pkg: "common", install: commonInstall, build: commonBuild });

        const client = states.clientapp;
        const clientInstall = force || !client.hasNodeModules || lockChanged(client);
        steps.push({ pkg: "clientapp", install: clientInstall,
            build: clientInstall || commonBuild || !client.hasOutput || changed(client, "source") });

        // The server runs from source through tsx, so it only needs its dependencies
        const server = states.webserver;
        steps.push({ pkg: "webserver", install: force || !server.hasNodeModules || lockChanged(server), build: false });

        return steps;
    }

    private outputExists(pkg: PackageName) {
        switch (pkg) {
            case "common": return fs.existsSync(path.join(this.repoDir, "common", "dist", "main", "index.js"));
            case "clientapp": return fs.existsSync(path.join(this.repoDir, "clientapp", "build", "index.html"));
            case "webserver": return true;
        }
    }

    // ---------------------------------------------------------------------------------
    // Rebuild what changed.  If a build fails but an older build exists we keep
    // going with it (ok + warning) so a bad commit doesn't take the page down.
    // ---------------------------------------------------------------------------------
    async build(log: (line: string) => void, force = false): Promise<PrepareResult> {
        const stampMaker = new BuildStamp(this.repoDir, this.runner);
        const saved = this.stamps.read() ?? {};
        const states = {} as { [pkg in PackageName]: PackageState };
        for (const pkg of DevWorkspace.PACKAGES) {
            states[pkg] = {
                stamp: await stampMaker.compute(pkg),
                previous: saved[pkg],
                hasNodeModules: fs.existsSync(path.join(this.repoDir, pkg, "node_modules")),
                hasOutput: this.outputExists(pkg),
            };
        }

        const steps = DevWorkspace.planBuild(states, force);
        if (steps.every(s => !s.install && !s.build)) {
            log("Everything is up to date; nothing to build.");
            return { ok: true };
        }

        for (const step of steps) {
            const cwd = path.join(this.repoDir, step.pkg);
            const npm = (args: string, env: NodeJS.ProcessEnv = process.env) => this.runner.run(`npm ${args}`, [], {
                cwd, shell: true, env, onLine: (line) => log(`${step.pkg}: ${line}`)
            });

            if (step.install) {
                log(`Installing dependencies for ${step.pkg}...`);
                let result = await npm("ci --no-audit --no-fund");
                if (result.code !== 0) {
                    log(`npm ci failed for ${step.pkg}; trying npm install...`);
                    result = await npm("install --no-audit --no-fund");
                }
                if (result.code !== 0) return this.failure(`npm install failed for ${step.pkg}`, step.pkg);
            }
            if (step.build) {
                log(`Building ${step.pkg}...`);
                if (step.pkg === "clientapp") {
                    // CRA empties its output folder before compiling, so build into a
                    // staging folder and swap it in only on success.  A failed build
                    // then leaves the last good one in place to fall back on.
                    const staging = path.join(cwd, "build.next");
                    fs.rmSync(staging, { recursive: true, force: true });
                    const result = await npm("run build", { ...process.env, BUILD_PATH: "build.next" });
                    if (result.code !== 0) {
                        fs.rmSync(staging, { recursive: true, force: true });
                        return this.failure(`The ${step.pkg} build failed`, step.pkg);
                    }
                    DevWorkspace.swapFolder(staging, path.join(cwd, "build"));
                } else {
                    const result = await npm("run build");
                    if (result.code !== 0) return this.failure(`The ${step.pkg} build failed`, step.pkg);
                }
            }
            saved[step.pkg] = states[step.pkg].stamp;
            this.stamps.write(saved);
        }
        log("Build complete.");
        return { ok: true };
    }

    // ---------------------------------------------------------------------------------
    // Replace target with source, keeping the old copy until the new one is in place
    // ---------------------------------------------------------------------------------
    static swapFolder(source: string, target: string) {
        const old = target + ".old";
        fs.rmSync(old, { recursive: true, force: true });
        if (fs.existsSync(target)) fs.renameSync(target, old);
        fs.renameSync(source, target);
        fs.rmSync(old, { recursive: true, force: true });
    }

    private failure(message: string, pkg: PackageName): PrepareResult {
        const canFallBack = DevWorkspace.PACKAGES.every(p => this.outputExists(p))
            && fs.existsSync(path.join(this.repoDir, pkg, "node_modules"));
        return canFallBack
            ? { ok: true, warning: `${message}. Running the previous build instead; see the log for details.` }
            : { ok: false, error: `${message}, and there is no previous build to fall back on. See the log for details.` };
    }
}
