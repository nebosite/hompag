import { expect } from "chai";
import { Cli } from "../Cli";

describe("Cli.parse", () => {
    it("reads the command and flags in both styles", () => {
        const parsed = Cli.parse(["install", "--mode", "dev", "--data=/x/y", "--yes", "--no-autostart"]);
        expect(parsed.command).equal("install");
        expect(parsed.flags).deep.equal({ mode: "dev", data: "/x/y", yes: true, autostart: false });
    });

    it("defaults to help", () => {
        expect(Cli.parse([]).command).equal("help");
        expect(Cli.parse(["--version"]).command).equal("version");
    });

    it("reads -n for logs", () => {
        expect(Cli.parse(["logs", "-n", "10"]).flags.n).equal("10");
    });

    it("turns flags into install options and validates them", () => {
        const options = Cli.installOptions(Cli.parse(["install", "--mode", "prod", "--port", "9000", "--no-start"]).flags);
        expect(options).deep.include({ mode: "prod", port: 9000, autostart: true, start: false });
        expect(() => Cli.installOptions({ mode: "fast" })).throw(/--mode/);
        expect(() => Cli.installOptions({ port: "abc" })).throw(/--port/);
    });

    it("formats durations", () => {
        expect(Cli.duration(5000)).equal("5s");
        expect(Cli.duration(3 * 3600 * 1000 + 120000)).equal("3h 2m");
        expect(Cli.duration(2 * 86400 * 1000)).equal("2d 0h");
    });
});
