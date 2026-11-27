import { Autostart } from "./Autostart";
import { CommandRunner } from "./CommandRunner";
import { LinuxAutostart } from "./LinuxAutostart";
import { MacAutostart } from "./MacAutostart";
import { WindowsAutostart } from "./WindowsAutostart";

// ---------------------------------------------------------------------------------
// Picks the right autostart mechanism for this OS
// ---------------------------------------------------------------------------------
export class AutostartFactory {
    static async create(platform: NodeJS.Platform = process.platform, runner = new CommandRunner()): Promise<Autostart> {
        switch (platform) {
            case "win32": return new WindowsAutostart(runner);
            case "darwin": return new MacAutostart(runner);
            default: return new LinuxAutostart(await LinuxAutostart.systemdAvailable(runner), runner);
        }
    }
}
