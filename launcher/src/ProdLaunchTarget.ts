import * as fs from "fs";
import * as path from "path";
import { LaunchCommand, LaunchTarget, PrepareResult } from "./LaunchTarget";

// ---------------------------------------------------------------------------------
// Runs an installed release:  <releaseDir>/server/index.mjs, serving
// <releaseDir>/clientapp.
// ---------------------------------------------------------------------------------
export class ProdLaunchTarget implements LaunchTarget {
    readonly mode = "prod";

    constructor(
        private releaseDir: string,
        readonly version: string,
        private configFile: string,
        private nodePath = process.execPath) {}

    get serverScript() { return path.join(this.releaseDir, "server", "index.mjs"); }

    async prepare(): Promise<PrepareResult> {
        if (!fs.existsSync(this.serverScript)) {
            return { ok: false, error: `The installed release is missing ${this.serverScript}. Run "hompag update" or reinstall.` };
        }
        return { ok: true };
    }

    launchCommand(): LaunchCommand {
        return {
            command: this.nodePath,
            args: [this.serverScript],
            cwd: this.releaseDir,
            env: {
                ...process.env,
                HOMPAG_CONFIG: this.configFile,
                HOMPAG_CLIENT_DIR: path.join(this.releaseDir, "clientapp"),
            },
        };
    }
}
