import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CommandRunner } from "./CommandRunner";

export interface PackageStamp {
    /** Fingerprint of the package's source (committed + uncommitted changes) */
    source: string
    /** Fingerprint of its dependency lock file */
    lock: string
}

// ---------------------------------------------------------------------------------
// Fingerprints a package in a git checkout so we only rebuild what changed.
// The source fingerprint combines git's tree hash for the folder (covers every
// committed change) with the status and timestamps of uncommitted files (covers
// local edits).  Ignored files (node_modules, build output) don't count.
// ---------------------------------------------------------------------------------
export class BuildStamp {
    constructor(private repoDir: string, private runner = new CommandRunner()) {}

    async compute(pkg: string): Promise<PackageStamp> {
        return { source: await this.sourceStamp(pkg), lock: this.lockStamp(pkg) };
    }

    async sourceStamp(pkg: string): Promise<string> {
        const git = (args: string[]) => this.runner.run("git", args, { cwd: this.repoDir });
        const tree = await git(["rev-parse", `HEAD:${pkg}`]);
        const status = await git(["status", "--porcelain", "--untracked-files=all", "--", pkg]);
        if (tree.code !== 0 || status.code !== 0) {
            throw new Error(`git could not read ${pkg}: ${(tree.stderr || status.stderr).trim()}`);
        }
        const hash = createHash("sha256").update(tree.stdout.trim()).update("\n");
        for (const line of status.stdout.split(/\r?\n/).filter(l => l.trim()).sort()) {
            const file = BuildStamp.pathFromStatusLine(line);
            hash.update(line).update(BuildStamp.fileState(path.join(this.repoDir, file))).update("\n");
        }
        return hash.digest("hex");
    }

    lockStamp(pkg: string): string {
        const dir = path.join(this.repoDir, pkg);
        const lock = ["package-lock.json", "package.json"].map(f => path.join(dir, f)).find(f => fs.existsSync(f));
        return lock ? createHash("sha256").update(fs.readFileSync(lock)).digest("hex") : "none";
    }

    // ---------------------------------------------------------------------------------
    // "XY path" or "XY old -> new" (renames), possibly quoted
    // ---------------------------------------------------------------------------------
    static pathFromStatusLine(line: string): string {
        let file = line.slice(3);
        const arrow = file.indexOf(" -> ");
        if (arrow >= 0) file = file.slice(arrow + 4);
        if (file.startsWith('"') && file.endsWith('"')) file = JSON.parse(file);
        return file;
    }

    private static fileState(file: string): string {
        try {
            const stat = fs.statSync(file);
            return `${stat.size}:${stat.mtimeMs}`;
        } catch {
            return "missing";
        }
    }
}
