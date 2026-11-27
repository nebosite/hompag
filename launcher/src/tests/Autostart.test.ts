import { expect } from "chai";
import { AutostartSpec } from "../Autostart";
import { LinuxAutostart } from "../LinuxAutostart";
import { MacAutostart } from "../MacAutostart";
import { WindowsAutostart } from "../WindowsAutostart";

describe("Autostart entries", () => {
    it("Windows: a hidden VBScript launcher and a Run value that calls it", () => {
        const spec: AutostartSpec = {
            nodePath: "C:\\Program Files\\nodejs\\node.exe",
            launcherPath: "C:\\Users\\pat\\AppData\\Local\\hompag\\hompag.mjs",
            appHome: "C:\\Users\\pat\\AppData\\Local\\hompag",
            logsDir: "C:\\Users\\pat\\AppData\\Local\\hompag\\logs",
        };
        const script = WindowsAutostart.renderScript(spec);
        expect(script).contains(`shell.Run """C:\\Program Files\\nodejs\\node.exe"" ""C:\\Users\\pat\\AppData\\Local\\hompag\\hompag.mjs"" run", 0, False`);
        expect(WindowsAutostart.renderRunValue(spec)).equal(`wscript.exe "C:\\Users\\pat\\AppData\\Local\\hompag\\hompag-autostart.vbs"`);
    });

    const posixSpec: AutostartSpec = {
        nodePath: "/home/pat/.nvm/versions/node/v22.1.0/bin/node",
        launcherPath: "/home/pat/my apps/hompag/hompag.mjs",
        appHome: "/home/pat/.local/share/hompag",
        logsDir: "/home/pat/.local/share/hompag/logs",
    };

    it("macOS: a LaunchAgent that runs at load and revives a dead supervisor", () => {
        const plist = MacAutostart.renderPlist(posixSpec);
        expect(plist).contains(`<string>${MacAutostart.LABEL}</string>`);
        expect(plist).contains("<string>/home/pat/my apps/hompag/hompag.mjs</string>");
        expect(plist).contains("<key>RunAtLoad</key>\n    <true/>");
        expect(plist).contains("<key>SuccessfulExit</key>\n        <false/>");
        // node's own folder is on PATH so nvm installs work at login
        expect(plist).contains("/home/pat/.nvm/versions/node/v22.1.0/bin:");
    });

    it("macOS: escapes XML special characters in paths", () => {
        const plist = MacAutostart.renderPlist({ ...posixSpec, launcherPath: "/a&b/<x>/hompag.mjs" });
        expect(plist).contains("<string>/a&amp;b/&lt;x&gt;/hompag.mjs</string>");
    });

    it("Linux: a systemd user unit with quoted paths and restart on failure", () => {
        const unit = LinuxAutostart.renderUnit(posixSpec);
        expect(unit).contains(`ExecStart="/home/pat/.nvm/versions/node/v22.1.0/bin/node" "/home/pat/my apps/hompag/hompag.mjs" run`);
        expect(unit).contains("Restart=on-failure");
        expect(unit).contains("WantedBy=default.target");
    });

    it("Linux: an XDG autostart entry for systems without systemd", () => {
        const entry = LinuxAutostart.renderDesktopEntry(posixSpec);
        expect(entry).contains(`Exec="/home/pat/.nvm/versions/node/v22.1.0/bin/node" "/home/pat/my apps/hompag/hompag.mjs" run`);
        expect(entry).contains("Type=Application");
    });
});
