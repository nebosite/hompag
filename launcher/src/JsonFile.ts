import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------------
// Small JSON file helper.  Writes are atomic (temp file + rename) so a crash or
// power loss mid-write never leaves a half-written settings file behind.
// ---------------------------------------------------------------------------------
export class JsonFile<T> {
    constructor(readonly file: string) {}

    get exists() { return fs.existsSync(this.file); }

    read(): T | undefined {
        try {
            return JSON.parse(fs.readFileSync(this.file, "utf8").replace(/^﻿/, "")) as T;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
            throw new Error(`Could not read ${this.file}: ${(err as Error).message}`);
        }
    }

    write(value: T, mode?: number) {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const temp = `${this.file}.${process.pid}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode });
        fs.renameSync(temp, this.file);
    }
}
