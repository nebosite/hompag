// Bundle the server into a single ES module for releases: dist-bundle/index.mjs
// A release is just this file plus the built client, so it runs on any OS with
// node and needs no node_modules.
import { build } from "esbuild";

// The legacy src/config.ts holds a developer's secrets and is gitignored.  index.ts
// imports it optionally, so stub it out: a release must never carry it, and a
// checkout without it (CI) must still bundle.  Releases read config.json at runtime.
const omitLegacyConfig = {
    name: "omit-legacy-config",
    setup(b) {
        b.onResolve({ filter: /^\.\/config$/ }, () => ({ path: "legacy-config", namespace: "omitted" }));
        b.onLoad({ filter: /.*/, namespace: "omitted" }, () => ({ contents: "export {}", loader: "js" }));
    },
};

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
    plugins: [omitLegacyConfig],
    logLevel: "info",
});
