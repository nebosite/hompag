// Bundle the server into a single ES module for releases: dist-bundle/index.mjs
// A release is just this file plus the built client, so it runs on any OS with
// node and needs no node_modules.
import { build } from "esbuild";

await build({
    entryPoints: ["src/index.ts"],
    outfile: "dist-bundle/index.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    sourcemap: "linked",
    // Some bundled CommonJS packages call require() for node built-ins
    banner: { js: "import { createRequire as __hompagCreateRequire } from 'module'; const require = __hompagCreateRequire(import.meta.url);" },
    // Optional native speedups for 'ws'; it falls back to JS when absent
    external: ["bufferutil", "utf-8-validate"],
    logLevel: "info",
});
