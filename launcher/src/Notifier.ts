import { spawn } from "child_process";

// ---------------------------------------------------------------------------------
// Best-effort desktop notification.  Never throws and never blocks; if the OS
// can't show one, the fallback page and log still tell the story.
// ---------------------------------------------------------------------------------
export class Notifier {
    constructor(private platform: NodeJS.Platform = process.platform) {}

    notify(title: string, message: string) {
        const command = Notifier.commandFor(this.platform, title, message);
        if (!command) return;
        try {
            const child = spawn(command.command, command.args, { stdio: "ignore", windowsHide: true, detached: true });
            child.on("error", () => {});
            child.unref();
        } catch {
            // ignore
        }
    }

    static commandFor(platform: NodeJS.Platform, title: string, message: string): { command: string, args: string[] } | undefined {
        switch (platform) {
            case "win32": {
                // Windows PowerShell 5.1 can reach the WinRT toast API; borrow PowerShell's app id.
                const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
                const script = [
                    "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null",
                    "$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
                    "$n = $t.GetElementsByTagName('text')",
                    `$n.Item(0).AppendChild($t.CreateTextNode(${q(title)})) | Out-Null`,
                    `$n.Item(1).AppendChild($t.CreateTextNode(${q(message)})) | Out-Null`,
                    "$id = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'",
                    "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($id).Show([Windows.UI.Notifications.ToastNotification]::new($t))",
                ].join("; ");
                return { command: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script] };
            }
            case "darwin": {
                const q = (s: string) => JSON.stringify(s);
                return { command: "osascript", args: ["-e", `display notification ${q(message)} with title ${q(title)}`] };
            }
            default:
                return { command: "notify-send", args: ["--app-name=hompag", title, message] };
        }
    }
}
