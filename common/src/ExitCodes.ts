
// ---------------------------------------------------------------------------------
// Process exit codes shared by the hompag server and the launcher/supervisor
// that runs it.  The supervisor uses these to decide whether to restart.
// ---------------------------------------------------------------------------------
export enum HompagExitCode {
    /** Clean, intentional stop.  Do not restart. */
    Clean = 0,
    /** Unhandled error.  Restart with backoff. */
    Crash = 1,
    /** Deliberate crash via /api/die (testing only). Treated as a crash. */
    TestDie = 55,
    /** Server asked to be restarted. Restart immediately. */
    RestartRequested = 75,
    /** Configuration is invalid (e.g. no store path).  Restarting won't help. */
    ConfigError = 78,
    /** The listening port is already in use. */
    PortInUse = 98,
}
