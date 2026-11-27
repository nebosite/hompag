import * as readline from "node:readline/promises";

export interface Choice<T> {
    label: string
    value: T
    detail?: string
}

// ---------------------------------------------------------------------------------
// Asks the user questions on the terminal.  In non-interactive mode (--yes, or no
// terminal attached) every question takes its default, and a question with no
// default is an error that tells the user which flag to pass instead.
// ---------------------------------------------------------------------------------
export class Prompter {
    private rl?: readline.Interface;

    constructor(readonly interactive: boolean = !!process.stdin.isTTY,
                private output: (text: string) => void = (text) => process.stdout.write(text + "\n")) {}

    say(text = "") { this.output(text); }

    private get reader() {
        this.rl ??= readline.createInterface({ input: process.stdin, output: process.stdout });
        return this.rl;
    }

    close() {
        this.rl?.close();
        this.rl = undefined;
    }

    // ---------------------------------------------------------------------------------
    // Free text with an optional default
    // ---------------------------------------------------------------------------------
    async ask(question: string, defaultValue?: string, flagHint?: string): Promise<string> {
        if (!this.interactive) {
            if (defaultValue === undefined) throw new Error(`${question} (pass ${flagHint ?? "it on the command line"})`);
            return defaultValue;
        }
        const suffix = defaultValue ? ` [${defaultValue}]` : "";
        const answer = (await this.reader.question(`${question}${suffix}: `)).trim();
        return answer === "" ? (defaultValue ?? "") : answer;
    }

    // ---------------------------------------------------------------------------------
    // Yes/no
    // ---------------------------------------------------------------------------------
    async confirm(question: string, defaultValue: boolean): Promise<boolean> {
        if (!this.interactive) return defaultValue;
        const answer = (await this.reader.question(`${question} ${defaultValue ? "[Y/n]" : "[y/N]"}: `)).trim().toLowerCase();
        if (answer === "") return defaultValue;
        return answer.startsWith("y");
    }

    // ---------------------------------------------------------------------------------
    // Pick one of a numbered list
    // ---------------------------------------------------------------------------------
    async choose<T>(question: string, choices: Choice<T>[], defaultIndex = 0): Promise<T> {
        if (!this.interactive) return choices[defaultIndex].value;
        this.say(question);
        choices.forEach((choice, i) => {
            this.say(`  ${i + 1}) ${choice.label}${i === defaultIndex ? "  (default)" : ""}`);
            if (choice.detail) this.say(`       ${choice.detail}`);
        });
        for (;;) {
            const answer = (await this.reader.question(`Choose 1-${choices.length} [${defaultIndex + 1}]: `)).trim();
            if (answer === "") return choices[defaultIndex].value;
            const n = Number(answer);
            if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
            this.say(`Please enter a number from 1 to ${choices.length}.`);
        }
    }
}
