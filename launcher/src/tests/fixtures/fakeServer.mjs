// A stand-in for the hompag server, used by the Supervisor tests.
//   FAKE_COUNTER      file that gets one line appended per start
//   FAKE_CRASH_TIMES  crash (exit 1) on the first N starts, then run normally
//   FAKE_BEHAVIOR     "healthy" (default) | "hang" (stop answering after a moment) | "config" (exit 78)
import * as fs from "fs";
import * as http from "http";

const counterFile = process.env.FAKE_COUNTER;
fs.appendFileSync(counterFile, "start\n");
const starts = fs.readFileSync(counterFile, "utf8").trim().split("\n").length;
const behavior = process.env.FAKE_BEHAVIOR ?? "healthy";
console.log(`fake server start #${starts} (${behavior})`);

if (behavior === "config") {
    console.error("CONFIGURATION ERROR: no store path");
    process.exit(78);
}
if (starts <= Number(process.env.FAKE_CRASH_TIMES ?? 0)) {
    setTimeout(() => { console.error("fake crash!"); process.exit(1); }, 100);
}

let answering = true;
const server = http.createServer((req, res) => {
    if (!answering) return; // hang: never respond
    res.end(JSON.stringify({ version: "9.9.9-fake", uptime: "0" }));
});
server.listen(Number(process.env.PORT));

if (behavior === "hang") setTimeout(() => { answering = false; }, 300);

process.on("message", (message) => {
    if (message?.cmd === "shutdown") {
        fs.appendFileSync(counterFile + ".shutdowns", "graceful\n");
        process.exit(0);
    }
});
