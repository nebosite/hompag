import { SupervisorStatus } from "./SupervisorStatus";

// ---------------------------------------------------------------------------------
// The page shown at the hompag address while the server is down.  Because the
// user's browser home page already points here, this is where they'll notice a
// problem.  While a restart is pending the page refreshes itself, so the real
// home page comes back on its own once the server is healthy.
// ---------------------------------------------------------------------------------
export class FallbackPage {

    static escape(text: string) {
        return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    }

    static headline(status: SupervisorStatus, now: number) {
        switch (status.state) {
            case "starting": return "hompag is starting…";
            case "running": return "hompag is running";
            case "restarting": {
                const seconds = Math.max(0, Math.ceil(((status.restartAt ?? now) - now) / 1000));
                return seconds > 0 ? `hompag crashed — restarting in ${seconds}s` : "hompag crashed — restarting…";
            }
            case "gaveUp": return "hompag has stopped";
            case "stopping": return "hompag is stopping…";
            case "stopped": return "hompag is stopped";
        }
    }

    static render(status: SupervisorStatus, logTail: readonly string[], now = Date.now()): string {
        const e = FallbackPage.escape;
        const autoRefresh = status.state === "starting" || status.state === "restarting" || status.state === "running";
        const canRestart = status.state === "gaveUp" || status.state === "restarting";
        const showLog = status.state !== "starting" || logTail.length > 0;

        return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${autoRefresh ? '<meta http-equiv="refresh" content="3">' : ""}
<title>hompag status</title>
<style>
  :root { --bg:#f6f7f9; --fg:#1d2330; --muted:#5b6475; --card:#fff; --border:#d9dde5; --accent:#2f6fde; --warn:#b4462b; --mono:#eef0f4; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#14171d; --fg:#e4e7ee; --muted:#9aa3b5; --card:#1d2129; --border:#323844; --accent:#6b9bff; --warn:#ff8a6b; --mono:#11141a; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width:820px; margin:48px auto; padding:0 16px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:24px; }
  h1 { margin:0 0 8px; font-size:22px; }
  h1.bad { color:var(--warn); }
  p { margin:6px 0; color:var(--muted); }
  .actions { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0 4px; }
  button, a.button { font:inherit; padding:8px 16px; border-radius:6px; border:1px solid var(--accent); cursor:pointer; text-decoration:none; }
  button { background:var(--accent); color:#fff; }
  a.button { background:transparent; color:var(--accent); }
  pre { background:var(--mono); border:1px solid var(--border); border-radius:6px; padding:12px; overflow:auto; max-height:360px; font-size:12px; white-space:pre-wrap; word-break:break-word; }
  code { font-size:13px; }
  dl { display:grid; grid-template-columns:max-content 1fr; gap:2px 12px; margin:16px 0 0; font-size:13px; color:var(--muted); }
  dd { margin:0; overflow-wrap:anywhere; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1 class="${status.state === "gaveUp" || status.state === "restarting" ? "bad" : ""}">${e(FallbackPage.headline(status, now))}</h1>
    <p>${e(status.message)}</p>
    ${autoRefresh ? "<p>This page will reload automatically.</p>" : ""}
    <div class="actions">
      ${canRestart ? `<form method="post" action="/_hompag/restart"><button type="submit">Restart hompag</button></form>` : ""}
      ${status.issueUrl ? `<a class="button" href="${e(status.issueUrl)}" target="_blank" rel="noopener">Report issue on GitHub</a>` : ""}
    </div>
    ${status.reportFile ? `<p>A crash report was saved to <code>${e(status.reportFile)}</code>. Please attach it to the issue if the log in the issue is cut short.</p>` : ""}
    ${showLog ? `<h2 style="font-size:15px;margin:20px 0 6px">Recent log</h2><pre>${e(logTail.join("\n")) || "(empty)"}</pre>` : ""}
    <dl>
      <dt>Version</dt><dd>${e(status.hompagVersion)} (${e(status.mode)} mode)</dd>
      <dt>Log file</dt><dd><code>${e(status.logFile)}</code></dd>
      <dt>Command line</dt><dd><code>hompag status</code> · <code>hompag restart</code> · <code>hompag logs</code></dd>
    </dl>
  </div>
</main>
</body>
</html>`;
    }
}
