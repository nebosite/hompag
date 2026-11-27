import { expect } from "chai";
import { DataFolderAdvisor, FileSystemProbe } from "../DataFolderAdvisor";

// A fake file system: a set of existing paths plus file contents
const fakeFs = (paths: string[], files: { [path: string]: string } = {}): FileSystemProbe => {
    const all = new Set([...paths, ...Object.keys(files)]);
    return {
        exists: (p) => [...all].some(x => x === p || x.startsWith(p + "/") || x.startsWith(p + "\\")),
        list: (p) => [...all]
            .filter(x => x.startsWith(p + "/") || x.startsWith(p + "\\"))
            .map(x => x.slice(p.length + 1).split(/[\\/]/)[0])
            .filter((v, i, a) => a.indexOf(v) === i),
        readText: (p) => { if (files[p] === undefined) throw new Error("ENOENT"); return files[p]; },
    };
}

describe("DataFolderAdvisor", () => {
    it("finds OneDrive and Dropbox on Windows", () => {
        const target = new DataFolderAdvisor("win32",
            { OneDrive: "C:\\Users\\pat\\OneDrive", APPDATA: "C:\\Users\\pat\\AppData\\Roaming" },
            "C:\\Users\\pat",
            fakeFs(["C:\\Users\\pat\\OneDrive", "D:\\Dropbox"], {
                "C:\\Users\\pat\\AppData\\Roaming\\Dropbox\\info.json": JSON.stringify({ personal: { path: "D:\\Dropbox" } })
            }));
        expect(target.detectCloudFolders()).deep.equal([
            { provider: "Dropbox", root: "D:\\Dropbox" },
            { provider: "OneDrive", root: "C:\\Users\\pat\\OneDrive" },
        ]);
    });

    it("does not list the same folder twice", () => {
        const target = new DataFolderAdvisor("win32",
            { OneDrive: "C:\\Users\\pat\\OneDrive", OneDriveConsumer: "C:\\Users\\pat\\OneDrive" },
            "C:\\Users\\pat", fakeFs(["C:\\Users\\pat\\OneDrive"]));
        expect(target.detectCloudFolders().length).equal(1);
    });

    it("finds macOS CloudStorage providers and iCloud", () => {
        const home = "/Users/pat";
        const target = new DataFolderAdvisor("darwin", {}, home, fakeFs([
            `${home}/Library/CloudStorage/OneDrive-Personal`,
            `${home}/Library/CloudStorage/GoogleDrive-pat@example.com/My Drive`,
            `${home}/Library/Mobile Documents/com~apple~CloudDocs`,
        ]));
        expect(target.detectCloudFolders().map(f => f.provider)).deep.equal(["Google Drive", "OneDrive (Personal)", "iCloud Drive"]);
    });

    it("finds Dropbox on Linux from its info file", () => {
        const target = new DataFolderAdvisor("linux", {}, "/home/pat", fakeFs(["/data/Dropbox"], {
            "/home/pat/.dropbox/info.json": JSON.stringify({ personal: { path: "/data/Dropbox" } })
        }));
        expect(target.detectCloudFolders()).deep.equal([{ provider: "Dropbox", root: "/data/Dropbox" }]);
    });

    it("suggests a hompag folder inside the cloud folder", () => {
        const target = new DataFolderAdvisor("linux", {}, "/home/pat", fakeFs([]));
        expect(target.suggestedPath({ provider: "Dropbox", root: "/home/pat/Dropbox" })).equal("/home/pat/Dropbox/hompag");
        expect(target.localDefault).equal("/home/pat/hompag-data");
    });

    it("recognizes existing hompag data (the second-machine case)", () => {
        const target = new DataFolderAdvisor("linux", {}, "/home/pat", fakeFs(["/d/hompag/page/home", "/d/other/notes.txt"]));
        expect(target.inspect("/d/hompag")).deep.equal({ exists: true, hasHompagData: true, hasOtherFiles: false });
        expect(target.inspect("/d/other")).deep.equal({ exists: true, hasHompagData: false, hasOtherFiles: true });
        expect(target.inspect("/d/nothing").exists).equal(false);
    });

    it("knows whether a folder is inside a synced folder", () => {
        const target = new DataFolderAdvisor("linux", {}, "/home/pat", fakeFs(["/home/pat/Dropbox"]));
        expect(target.isCloudSynced("/home/pat/Dropbox/stuff/hompag")?.provider).equal("Dropbox");
        expect(target.isCloudSynced("/home/pat/DropboxNot/hompag")).equal(undefined);
        expect(target.isCloudSynced("/tmp/hompag")).equal(undefined);
    });
});
