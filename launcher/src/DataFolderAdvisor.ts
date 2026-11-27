import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface CloudFolder {
    provider: string
    root: string
}

export interface FolderInspection {
    exists: boolean
    /** Already contains hompag data (e.g. synced from another machine) */
    hasHompagData: boolean
    /** Exists and has files that aren't hompag's */
    hasOtherFiles: boolean
}

export interface FileSystemProbe {
    exists(p: string): boolean
    list(p: string): string[]
    readText(p: string): string
}

const realFs: FileSystemProbe = {
    exists: (p) => fs.existsSync(p),
    list: (p) => { try { return fs.readdirSync(p); } catch { return []; } },
    readText: (p) => fs.readFileSync(p, "utf8"),
};

// ---------------------------------------------------------------------------------
// Helps the user choose where hompag keeps its data.  To see the same page on
// every machine, the data folder must be inside a cloud-synced folder, so we look
// for the common sync clients and suggest a "hompag" folder inside them.
// ---------------------------------------------------------------------------------
export class DataFolderAdvisor {
    private path: path.PlatformPath;

    constructor(
        private platform: NodeJS.Platform = process.platform,
        private env: NodeJS.ProcessEnv = process.env,
        private home: string = os.homedir(),
        private probe: FileSystemProbe = realFs) {
        this.path = platform === "win32" ? path.win32 : path.posix;
    }

    get localDefault() { return this.path.join(this.home, "hompag-data"); }

    suggestedPath(cloud: CloudFolder) { return this.path.join(cloud.root, "hompag"); }

    // ---------------------------------------------------------------------------------
    // Find cloud-synced folders on this machine
    // ---------------------------------------------------------------------------------
    detectCloudFolders(): CloudFolder[] {
        const found: CloudFolder[] = [];
        const add = (provider: string, root: string | undefined) => {
            if (!root || !this.probe.exists(root)) return;
            const key = root.toLowerCase().replace(/[\\/]+$/, "");
            if (!found.some(f => f.root.toLowerCase().replace(/[\\/]+$/, "") === key)) found.push({ provider, root });
        }
        const j = (...parts: string[]) => this.path.join(...parts);

        // Dropbox records its folder locations in info.json
        for (const info of this.dropboxInfoFiles()) {
            for (const [kind, provider] of [["personal", "Dropbox"], ["business", "Dropbox (business)"]]) {
                add(provider, this.readDropboxPath(info, kind));
            }
        }

        switch (this.platform) {
            case "win32":
                add("OneDrive", this.env.OneDriveConsumer);
                add("OneDrive", this.env.OneDrive);
                add("OneDrive (work)", this.env.OneDriveCommercial);
                add("Dropbox", j(this.home, "Dropbox"));
                add("Google Drive", "G:\\My Drive");
                add("iCloud Drive", j(this.home, "iCloudDrive"));
                break;
            case "darwin": {
                const cloudStorage = j(this.home, "Library", "CloudStorage");
                for (const name of this.probe.list(cloudStorage).sort()) {
                    if (name.startsWith("OneDrive")) add(name.includes("-") ? `OneDrive (${name.split("-").slice(1).join("-")})` : "OneDrive", j(cloudStorage, name));
                    else if (name.startsWith("Dropbox")) add("Dropbox", j(cloudStorage, name));
                    else if (name.startsWith("GoogleDrive")) add("Google Drive", j(cloudStorage, name, "My Drive"));
                    else if (name.startsWith("Box")) add("Box", j(cloudStorage, name));
                }
                add("Dropbox", j(this.home, "Dropbox"));
                add("iCloud Drive", j(this.home, "Library", "Mobile Documents", "com~apple~CloudDocs"));
                break;
            }
            default:
                add("Dropbox", j(this.home, "Dropbox"));
                add("OneDrive", j(this.home, "OneDrive"));
                add("Nextcloud", j(this.home, "Nextcloud"));
                add("pCloud", j(this.home, "pCloudDrive"));
                break;
        }
        return found;
    }

    private dropboxInfoFiles(): string[] {
        const j = (...parts: string[]) => this.path.join(...parts);
        const candidates = this.platform === "win32"
            ? [this.env.APPDATA && j(this.env.APPDATA, "Dropbox", "info.json"),
               this.env.LOCALAPPDATA && j(this.env.LOCALAPPDATA, "Dropbox", "info.json")]
            : [j(this.home, ".dropbox", "info.json")];
        return candidates.filter((c): c is string => !!c && this.probe.exists(c));
    }

    private readDropboxPath(infoFile: string, kind: string): string | undefined {
        try {
            return JSON.parse(this.probe.readText(infoFile))?.[kind]?.path;
        } catch {
            return undefined;
        }
    }

    // ---------------------------------------------------------------------------------
    // What's already in a candidate folder?
    // ---------------------------------------------------------------------------------
    inspect(folder: string): FolderInspection {
        if (!this.probe.exists(folder)) return { exists: false, hasHompagData: false, hasOtherFiles: false };
        const entries = this.probe.list(folder).filter(e => !e.startsWith("."));
        const hompagDirs = ["page", "widget", "config", "cache"];
        const hasHompagData = entries.some(e => e === "page" || e === "widget");
        const hasOtherFiles = entries.some(e => !hompagDirs.includes(e));
        return { exists: true, hasHompagData, hasOtherFiles };
    }

    // ---------------------------------------------------------------------------------
    // True if the folder is inside one of the detected cloud folders
    // ---------------------------------------------------------------------------------
    isCloudSynced(folder: string): CloudFolder | undefined {
        const norm = (p: string) => this.path.resolve(p).toLowerCase().replace(/[\\/]+$/, "") + this.path.sep;
        return this.detectCloudFolders().find(c => norm(folder).startsWith(norm(c.root)));
    }

    // ---------------------------------------------------------------------------------
    // Create the folder if needed and make sure we can write to it.  Returns an
    // error message, or undefined if all is well.
    // ---------------------------------------------------------------------------------
    static ensureWritable(folder: string): string | undefined {
        try {
            fs.mkdirSync(folder, { recursive: true });
            const testFile = path.join(folder, `.hompag-write-test-${process.pid}`);
            fs.writeFileSync(testFile, "ok");
            fs.unlinkSync(testFile);
            return undefined;
        } catch (err) {
            return `Can't write to ${folder}: ${(err as Error).message}`;
        }
    }
}
