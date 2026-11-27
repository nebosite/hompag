import { CommandRunner } from "./CommandRunner";

// ---------------------------------------------------------------------------------
// Checks for the tools hompag needs, with advice on getting them
// ---------------------------------------------------------------------------------
export class Prerequisites {
    static readonly MIN_NODE_MAJOR = 20;

    constructor(private runner = new CommandRunner(), private platform: NodeJS.Platform = process.platform) {}

    /** Error message if this node is too old, else undefined */
    checkNode(version = process.versions.node): string | undefined {
        const major = Number(version.split(".")[0]);
        if (major >= Prerequisites.MIN_NODE_MAJOR) return undefined;
        return `hompag needs Node.js ${Prerequisites.MIN_NODE_MAJOR} or newer (this is ${version}). ${this.nodeAdvice()}`;
    }

    nodeAdvice() {
        switch (this.platform) {
            case "win32": return "Install it with 'winget install OpenJS.NodeJS.LTS' or from https://nodejs.org";
            case "darwin": return "Install it with 'brew install node' or from https://nodejs.org";
            default: return "Install it with your package manager, nvm (https://github.com/nvm-sh/nvm), or from https://nodejs.org";
        }
    }

    /** Error message if git is missing, else undefined */
    async checkGit(): Promise<string | undefined> {
        if (await this.runner.exists("git")) return undefined;
        const advice = this.platform === "win32" ? "'winget install Git.Git'"
            : this.platform === "darwin" ? "'xcode-select --install' or 'brew install git'"
            : "your package manager";
        return `Developer mode needs git. Install it with ${advice}, then run the installer again.`;
    }

    async hasGitHubCli(): Promise<boolean> {
        return this.runner.exists("gh");
    }
}
