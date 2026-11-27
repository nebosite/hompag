import { spawn, SpawnOptions } from "child_process";

export interface CommandResult {
    code: number
    stdout: string
    stderr: string
}

export interface RunOptions {
    cwd?: string
    env?: NodeJS.ProcessEnv
    /** Run through the shell (needed for npm/npx on Windows) */
    shell?: boolean
    /** Called with each line of output as it arrives */
    onLine?: (line: string, stream: "stdout" | "stderr") => void
    /** Text to write to stdin */
    input?: string
}

// ---------------------------------------------------------------------------------
// Runs external commands and captures their output.  Never throws on a non-zero
// exit; callers check result.code.  Throws only if the program can't be started
// at all, in which case code is -1 and stderr has the reason.
// ---------------------------------------------------------------------------------
export class CommandRunner {

    async run(command: string, args: string[], options: RunOptions = {}): Promise<CommandResult> {
        const spawnOptions: SpawnOptions = {
            cwd: options.cwd,
            env: options.env ?? process.env,
            shell: options.shell ?? false,
            windowsHide: true,
            stdio: [options.input !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
        };

        return new Promise((resolve) => {
            let stdout = "";
            let stderr = "";
            let settled = false;
            const finish = (result: CommandResult) => {
                if (!settled) { settled = true; resolve(result); }
            }

            let child;
            try {
                child = spawn(command, args, spawnOptions);
            } catch (err) {
                finish({ code: -1, stdout, stderr: (err as Error).message });
                return;
            }

            const lineSplitter = (stream: "stdout" | "stderr") => {
                let partial = "";
                return (chunk: Buffer) => {
                    const text = chunk.toString();
                    if (stream === "stdout") stdout += text; else stderr += text;
                    if (!options.onLine) return;
                    const lines = (partial + text).split(/\r?\n/);
                    partial = lines.pop() ?? "";
                    for (const line of lines) options.onLine(line, stream);
                }
            }
            child.stdout?.on("data", lineSplitter("stdout"));
            child.stderr?.on("data", lineSplitter("stderr"));
            if (options.input !== undefined) {
                child.stdin?.end(options.input);
            }
            child.on("error", (err) => finish({ code: -1, stdout, stderr: stderr + err.message }));
            child.on("close", (code) => finish({ code: code ?? -1, stdout, stderr }));
        });
    }

    // ---------------------------------------------------------------------------------
    // True if the command can be run at all (e.g. "git --version")
    // ---------------------------------------------------------------------------------
    async exists(command: string, args: string[] = ["--version"]): Promise<boolean> {
        const result = await this.run(command, args, { shell: process.platform === "win32" });
        return result.code === 0;
    }
}
