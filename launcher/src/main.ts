import { Cli } from "./Cli";

// Replaced with the package version when bundled (see scripts/bundle.mjs)
declare const __LAUNCHER_VERSION__: string;
const version = typeof __LAUNCHER_VERSION__ === "string" ? __LAUNCHER_VERSION__ : "dev";

// Let the process end on its own rather than calling process.exit(): on Windows,
// exiting while fetch() handles are still closing trips a libuv assertion.
process.exitCode = await new Cli(version).run(process.argv.slice(2));
