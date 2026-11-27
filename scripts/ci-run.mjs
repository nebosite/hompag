// ---------------------------------------------------------------------------------
// CI helper: run a shell command, pass its output through, and if it fails, emit
// the tail of the output as a GitHub "::error::" annotation.  Annotations show on
// the run's summary page without signing in, unlike the raw step logs.
//
//   node scripts/ci-run.mjs "<title>" "<command>"
// ---------------------------------------------------------------------------------
import { spawn } from "child_process";

const [title, command] = process.argv.slice(2);
if (!title || !command) {
    console.error('usage: node scripts/ci-run.mjs "<title>" "<command>"');
    process.exit(2);
}

const TAIL_LINES = 60;
let tail = [];
const keep = (chunk) => {
    tail.push(...chunk.toString().split(/\r?\n/));
    if (tail.length > TAIL_LINES * 4) tail = tail.slice(-TAIL_LINES);
};

const child = spawn(command, { shell: true, stdio: ["inherit", "pipe", "pipe"] });
child.stdout.on("data", (d) => { process.stdout.write(d); keep(d); });
child.stderr.on("data", (d) => { process.stderr.write(d); keep(d); });
child.on("close", (code, signal) => {
    if (code === 0) return;
    const body = tail.slice(-TAIL_LINES).join("\n")
        // strip ANSI colors, then escape for the workflow command syntax
        .replace(/\u001b\[[0-9;]*m/g, "")
        .replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    const os = process.env.RUNNER_OS ?? process.platform;
    console.log(`::error title=${title} failed on ${os}::${body}`);
    process.exit(code ?? 1);
});
