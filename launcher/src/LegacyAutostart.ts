import { CommandRunner } from "./CommandRunner";

// ---------------------------------------------------------------------------------
// Before this installer, the README told Windows users to make a Task Scheduler
// task that runs webserver\scripts\hompagserver.vbs at logon.  If one exists it
// would race the new autostart for the same port, so the installer offers to
// disable it (not delete it; it can be re-enabled in Task Scheduler).
// ---------------------------------------------------------------------------------
export class LegacyAutostart {
    constructor(private runner = new CommandRunner(), private platform: NodeJS.Platform = process.platform) {}

    /** Full names (path + name) of enabled scheduled tasks that run hompagserver.vbs/.bat */
    async findTasks(): Promise<string[]> {
        if (this.platform !== "win32") return [];
        const script = "Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' -and "
            + "(($_.Actions | ForEach-Object { \"$($_.Execute) $($_.Arguments)\" }) -match 'hompagserver') } | "
            + "ForEach-Object { $_.TaskPath + $_.TaskName }";
        const result = await this.runner.run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
        if (result.code !== 0) return [];
        return result.stdout.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    }

    async disable(taskName: string): Promise<boolean> {
        const result = await this.runner.run("schtasks", ["/change", "/tn", taskName, "/disable"]);
        return result.code === 0;
    }
}
