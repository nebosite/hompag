import { expect } from "chai";
import { createHash } from "crypto";
import { ReleaseFetcher } from "../ReleaseFetcher";

describe("ReleaseFetcher", () => {
    it("reads the assets it needs from a GitHub release", () => {
        const info = ReleaseFetcher.parseRelease({
            tag_name: "v0.6.0",
            assets: [
                { name: "hompag-0.6.0.tar.gz", browser_download_url: "https://x/archive" },
                { name: "SHA256SUMS", browser_download_url: "https://x/sums" },
                { name: "hompag.mjs", browser_download_url: "https://x/launcher" },
            ]
        });
        expect(info).deep.equal({
            version: "0.6.0", tag: "v0.6.0",
            archiveUrl: "https://x/archive", checksumsUrl: "https://x/sums", launcherUrl: "https://x/launcher"
        });
    });

    it("rejects a release without its archive", () => {
        expect(() => ReleaseFetcher.parseRelease({ tag_name: "v1.0.0", assets: [] })).throw(/missing/);
    });

    it("verifies checksums in sha256sum format", () => {
        const bytes = Buffer.from("hello");
        const hash = createHash("sha256").update(bytes).digest("hex");
        const sums = `0000  other.tar.gz\n${hash}  hompag-1.0.0.tar.gz\n`;
        expect(() => ReleaseFetcher.verify(bytes, "hompag-1.0.0.tar.gz", sums)).not.throw();
        expect(() => ReleaseFetcher.verify(Buffer.from("tampered"), "hompag-1.0.0.tar.gz", sums)).throw(/mismatch/);
        expect(() => ReleaseFetcher.verify(bytes, "missing.tar.gz", sums)).throw(/no entry/);
    });
});
