
export interface AutostartSpec {
    /** Absolute path to node */
    nodePath: string
    /** Absolute path to the installed launcher (hompag.mjs) */
    launcherPath: string
    /** The launcher's app home folder */
    appHome: string
    logsDir: string
}

// ---------------------------------------------------------------------------------
// Starts the hompag supervisor when the user logs in.  Registering is idempotent:
// the entry is overwritten in place, never duplicated.  (And if two supervisors
// do start, InstanceLock makes the second one exit.)
// ---------------------------------------------------------------------------------
export interface Autostart {
    /** Human description, e.g. "Windows Run key (HKCU)" */
    readonly description: string
    register(spec: AutostartSpec): Promise<void>
    unregister(): Promise<void>
    isRegistered(): Promise<boolean>
    /** Start the supervisor now, the same way login would */
    startNow(spec: AutostartSpec): Promise<void>
}
