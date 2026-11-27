import * as path from "path";
import { DevWorkspace } from "./DevWorkspace";
import { LaunchCommand, LaunchTarget, PrepareResult } from "./LaunchTarget";

// ---------------------------------------------------------------------------------
// Developer mode: on each supervisor start, pull (when safe) and rebuild what
// changed, then run the server from source through tsx.  Crash restarts reuse
// the build and don't come through prepare() again.
// ---------------------------------------------------------------------------------
export class DevLaunchTarget implements LaunchTarget {
    readonly mode = "dev";

    constructor(
        private workspace: DevWorkspace,
        private configFile: string,
        private autoPull = true,
        private nodePath = process.execPath) {}

    get version() { return this.workspace.version; }

    async prepare(log: (line: string) => void): Promise<PrepareResult> {
        if (this.autoPull) await this.workspace.pull(log);
        return this.workspace.build(log);
    }

    launchCommand(): LaunchCommand {
        const serverDir = path.join(this.workspace.repoDir, "webserver");
        return {
            command: this.nodePath,
            // Load tsx in-process (not via the tsx CLI) so the IPC channel reaches the server
            args: ["--import", "tsx", "src/index.ts"],
            cwd: serverDir,
            env: { ...process.env, ISDEV: "1", HOMPAG_CONFIG: this.configFile },
        };
    }
}
