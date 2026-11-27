
// ---------------------------------------------------------------------------------
// How hompag is installed on this machine (<app home>/settings.json)
// ---------------------------------------------------------------------------------
export interface InstallSettings {
    mode: "prod" | "dev"
    /** prod: the release version that runs */
    version?: string
    /** prod: the version before the last update, kept for rollback */
    previousVersion?: string
    /** dev: the git checkout */
    repoPath?: string
    /** Absolute path of the node that autostart runs */
    nodePath: string
    /** Whether a login autostart entry was registered */
    autostart: boolean
    installedAt: string
}

// ---------------------------------------------------------------------------------
// The server's runtime configuration (<app home>/config.json).  Same shape the
// server's RuntimeConfig reads.  Kept on this machine, outside the synced data
// folder, because it holds API keys.
// ---------------------------------------------------------------------------------
export interface ServerConfigFile {
    storePath: string
    port: number
    spotify?: { clientId?: string, clientSecret?: string }
    axios?: { apiKey?: string }
}
