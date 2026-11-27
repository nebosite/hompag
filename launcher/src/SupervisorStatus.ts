
export type SupervisorState =
    | "starting"    // preparing (dev: pulling/building) or waiting for the first health check
    | "running"     // server is up and healthy
    | "restarting"  // server crashed; waiting out the backoff delay
    | "gaveUp"      // too many crashes (or bad config); waiting for the user
    | "stopping"
    | "stopped"

// ---------------------------------------------------------------------------------
// Snapshot of what the supervisor is doing.  Shown on the fallback page and
// returned by "hompag status".
// ---------------------------------------------------------------------------------
export interface SupervisorStatus {
    state: SupervisorState
    message: string
    mode: string
    port: number
    hompagVersion: string
    launcherVersion: string
    supervisorPid: number
    serverPid?: number
    serverStartedAt?: number
    restartAt?: number
    crashCount: number
    issueUrl?: string
    reportFile?: string
    logFile: string
}
