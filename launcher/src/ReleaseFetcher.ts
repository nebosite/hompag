import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CommandRunner } from "./CommandRunner";

export interface ReleaseInfo {
    version: string
    tag: string
    archiveUrl: string
    checksumsUrl: string
    launcherUrl?: string
}

// ---------------------------------------------------------------------------------
// Finds, downloads, verifies, and unpacks production releases from GitHub.
// Releases are unpacked to releases/<version>.partial and renamed into place
// only once complete, so a failed download never leaves a broken install.
// ---------------------------------------------------------------------------------
export class ReleaseFetcher {
    constructor(
        private releasesDir: string,
        private repo = "nebosite/hompag",
        private runner = new CommandRunner(),
        private log: (line: string) => void = () => {}) {}

    // ---------------------------------------------------------------------------------
    // Look up a release: the latest, or a specific tag like "v0.6.0"
    // ---------------------------------------------------------------------------------
    async find(tag?: string): Promise<ReleaseInfo> {
        const url = tag
            ? `https://api.github.com/repos/${this.repo}/releases/tags/${tag.startsWith("v") ? tag : "v" + tag}`
            : `https://api.github.com/repos/${this.repo}/releases/latest`;
        const response = await fetch(url, {
            headers: { "Accept": "application/vnd.github+json", "User-Agent": "hompag-launcher" },
            signal: AbortSignal.timeout(30000),
        });
        if (response.status === 404) {
            throw new Error(tag ? `There is no hompag release ${tag}.` : "No hompag releases have been published yet. Use developer mode, or --from-source.");
        }
        if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${url}`);
        return ReleaseFetcher.parseRelease(await response.json());
    }

    static parseRelease(json: any): ReleaseInfo {
        const tag: string = json.tag_name;
        const version = tag.replace(/^v/, "");
        const assets: { name: string, browser_download_url: string }[] = json.assets ?? [];
        const asset = (name: string) => assets.find(a => a.name === name)?.browser_download_url;
        const archiveUrl = asset(`hompag-${version}.tar.gz`);
        const checksumsUrl = asset("SHA256SUMS");
        if (!archiveUrl || !checksumsUrl) throw new Error(`Release ${tag} is missing its hompag-${version}.tar.gz or SHA256SUMS asset.`);
        return { version, tag, archiveUrl, checksumsUrl, launcherUrl: asset("hompag.mjs") };
    }

    isInstalled(version: string) {
        return fs.existsSync(path.join(this.releasesDir, version, "server", "index.mjs"));
    }

    // ---------------------------------------------------------------------------------
    // Download, verify, and unpack a release.  Returns the release folder.
    // ---------------------------------------------------------------------------------
    async install(release: ReleaseInfo): Promise<string> {
        const finalDir = path.join(this.releasesDir, release.version);
        if (this.isInstalled(release.version)) {
            this.log(`hompag ${release.version} is already downloaded.`);
            return finalDir;
        }
        fs.mkdirSync(this.releasesDir, { recursive: true });
        const archive = path.join(this.releasesDir, `hompag-${release.version}.tar.gz`);
        try {
            this.log(`Downloading hompag ${release.version}...`);
            const [archiveBytes, sums] = await Promise.all([
                this.download(release.archiveUrl),
                this.download(release.checksumsUrl).then(b => b.toString("utf8")),
            ]);
            ReleaseFetcher.verify(archiveBytes, path.basename(archive), sums);
            fs.writeFileSync(archive, archiveBytes);
            await this.unpack(archive, finalDir);
        } finally {
            fs.rmSync(archive, { force: true });
        }
        return finalDir;
    }

    // ---------------------------------------------------------------------------------
    // Install from an already-assembled release folder (used by --from-source)
    // ---------------------------------------------------------------------------------
    installFromFolder(sourceDir: string, version: string): string {
        const finalDir = path.join(this.releasesDir, version);
        const partial = finalDir + ".partial";
        fs.rmSync(partial, { recursive: true, force: true });
        fs.cpSync(sourceDir, partial, { recursive: true });
        fs.rmSync(finalDir, { recursive: true, force: true });
        fs.renameSync(partial, finalDir);
        return finalDir;
    }

    // ---------------------------------------------------------------------------------
    // Fetch the launcher by itself (to update the installed hompag.mjs)
    // ---------------------------------------------------------------------------------
    async downloadLauncher(release: ReleaseInfo): Promise<Buffer | undefined> {
        if (!release.launcherUrl) return undefined;
        const [bytes, sums] = await Promise.all([
            this.download(release.launcherUrl),
            this.download(release.checksumsUrl).then(b => b.toString("utf8")),
        ]);
        ReleaseFetcher.verify(bytes, "hompag.mjs", sums);
        return bytes;
    }

    static verify(bytes: Buffer, fileName: string, sums: string) {
        const expected = sums.split(/\r?\n/)
            .map(line => line.trim().split(/\s+\*?/))
            .find(([, name]) => name === fileName)?.[0];
        if (!expected) throw new Error(`SHA256SUMS has no entry for ${fileName}`);
        const actual = createHash("sha256").update(bytes).digest("hex");
        if (actual !== expected.toLowerCase()) {
            throw new Error(`Checksum mismatch for ${fileName}: the download may be corrupt. Please try again.`);
        }
    }

    // ---------------------------------------------------------------------------------
    // Remove old releases, keeping the ones listed
    // ---------------------------------------------------------------------------------
    prune(keep: (string | undefined)[]) {
        if (!fs.existsSync(this.releasesDir)) return;
        for (const name of fs.readdirSync(this.releasesDir)) {
            if (!keep.includes(name)) {
                this.log(`Removing old release ${name}`);
                fs.rmSync(path.join(this.releasesDir, name), { recursive: true, force: true });
            }
        }
    }

    private async download(url: string): Promise<Buffer> {
        const response = await fetch(url, { headers: { "User-Agent": "hompag-launcher" }, signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
        return Buffer.from(await response.arrayBuffer());
    }

    private async unpack(archive: string, finalDir: string) {
        const partial = finalDir + ".partial";
        fs.rmSync(partial, { recursive: true, force: true });
        fs.mkdirSync(partial, { recursive: true });
        // Windows 10+ ships bsdtar; prefer it over any tar on PATH (Git Bash's
        // GNU tar treats "C:" as a remote host).
        const tar = process.platform === "win32"
            ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
            : "tar";
        const result = await this.runner.run(tar, ["-xzf", archive, "-C", partial, "--strip-components=1"]);
        if (result.code !== 0) {
            fs.rmSync(partial, { recursive: true, force: true });
            throw new Error(`Could not unpack ${archive}: ${result.stderr.trim()}`);
        }
        fs.rmSync(finalDir, { recursive: true, force: true });
        fs.renameSync(partial, finalDir);
    }
}
