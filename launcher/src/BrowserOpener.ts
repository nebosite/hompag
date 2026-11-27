import { spawn } from "child_process";

// ---------------------------------------------------------------------------------
// Opens a URL in the user's default browser
// ---------------------------------------------------------------------------------
export class BrowserOpener {
    constructor(private platform: NodeJS.Platform = process.platform) {}

    open(url: string): boolean {
        const command = BrowserOpener.commandFor(this.platform, url);
        try {
            const child = spawn(command.command, command.args, { stdio: "ignore", detached: true, windowsHide: true });
            child.on("error", () => {});
            child.unref();
            return true;
        } catch {
            return false;
        }
    }

    static commandFor(platform: NodeJS.Platform, url: string) {
        switch (platform) {
            // rundll32 hands the URL straight to the shell, avoiding cmd.exe's
            // mangling of '&' in long query strings.
            case "win32": return { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] };
            case "darwin": return { command: "open", args: [url] };
            default: return { command: "xdg-open", args: [url] };
        }
    }
}
