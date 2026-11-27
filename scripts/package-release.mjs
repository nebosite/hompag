// Assemble a production release from already-built packages.
//
//   node build-all.js                  (builds common, clientapp, webserver, launcher)
//   node scripts/package-release.mjs
//
// Produces, under release/:
//   hompag-<version>/          server/index.mjs, clientapp/, hompag.mjs, VERSION
//   hompag-<version>.tar.gz    the same folder, archived (the release asset)
//   hompag.mjs                 the launcher on its own (what install scripts download)
//   SHA256SUMS                 checksums for the above
//
// The release is platform-neutral: it needs only node to run.
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(fs.readFileSync(path.join(root, "webserver", "package.json"), "utf8")).version;
const releaseRoot = path.join(root, "release");
const name = `hompag-${version}`;
const staging = path.join(releaseRoot, name);

const need = (file, hint) => {
    if (!fs.existsSync(file)) {
        console.error(`Missing ${path.relative(root, file)}. ${hint}`);
        process.exit(1);
    }
};

// Always bundle the server fresh; the others come from their normal builds
execFileSync(process.execPath, ["scripts/bundle.mjs"], { cwd: path.join(root, "webserver"), stdio: "inherit" });
need(path.join(root, "webserver", "dist-bundle", "index.mjs"), "The server bundle failed.");
need(path.join(root, "clientapp", "build", "index.html"), "Build the client first (cd clientapp && npm run build).");
need(path.join(root, "launcher", "dist", "hompag.mjs"), "Build the launcher first (cd launcher && npm run build).");

fs.rmSync(releaseRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(staging, "server"), { recursive: true });
fs.copyFileSync(path.join(root, "webserver", "dist-bundle", "index.mjs"), path.join(staging, "server", "index.mjs"));
fs.copyFileSync(path.join(root, "webserver", "dist-bundle", "index.mjs.map"), path.join(staging, "server", "index.mjs.map"));
fs.cpSync(path.join(root, "clientapp", "build"), path.join(staging, "clientapp"), { recursive: true });
fs.copyFileSync(path.join(root, "launcher", "dist", "hompag.mjs"), path.join(staging, "hompag.mjs"));
fs.copyFileSync(path.join(root, "launcher", "dist", "hompag.mjs"), path.join(releaseRoot, "hompag.mjs"));
fs.writeFileSync(path.join(staging, "VERSION"), version + "\n");

// Windows' own bsdtar handles drive-letter paths; a tar from Git Bash may not
const tar = process.platform === "win32"
    ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
    : "tar";
const archive = `${name}.tar.gz`;
execFileSync(tar, ["-czf", archive, name], { cwd: releaseRoot, stdio: "inherit" });

const sha = (file) => createHash("sha256").update(fs.readFileSync(path.join(releaseRoot, file))).digest("hex");
const sums = [archive, "hompag.mjs"].map(f => `${sha(f)}  ${f}`).join("\n") + "\n";
fs.writeFileSync(path.join(releaseRoot, "SHA256SUMS"), sums);

console.log(`\nRelease ${version} is ready in ${path.relative(root, releaseRoot)}/`);
process.stdout.write(sums);
