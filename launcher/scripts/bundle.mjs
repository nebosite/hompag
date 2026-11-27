// Bundle the launcher into a single dependency-free file: dist/hompag.mjs
// This one file is what gets attached to each GitHub release and installed
// into the user's app folder.
import { build } from "esbuild";
import { readFileSync } from "fs";

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

await build({
    entryPoints: ["src/main.ts"],
    outfile: "dist/hompag.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    define: { __LAUNCHER_VERSION__: JSON.stringify(version) },
    banner: { js: "// hompag launcher - https://github.com/nebosite/hompag" },
    logLevel: "info",
});
