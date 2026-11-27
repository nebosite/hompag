
export interface LaunchCommand {
    command: string
    args: string[]
    cwd: string
    env: NodeJS.ProcessEnv
}

export interface PrepareResult {
    /** False if the server can't be started (e.g. the first build failed) */
    ok: boolean
    /** Something the user should know about even when ok (e.g. "build failed, running last good build") */
    warning?: string
    error?: string
}

// ---------------------------------------------------------------------------------
// What the supervisor runs.  Production runs an installed release; developer
// mode pulls and rebuilds a git checkout first.
// ---------------------------------------------------------------------------------
export interface LaunchTarget {
    readonly mode: "prod" | "dev"
    /** The hompag version this target will run */
    readonly version: string
    /** Work to do once per supervisor start (not on crash restarts) */
    prepare(log: (line: string) => void): Promise<PrepareResult>
    /** How to start the server process */
    launchCommand(): LaunchCommand
}
