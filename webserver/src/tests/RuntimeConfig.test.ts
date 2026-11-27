import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigError, RuntimeConfig } from "../helpers/RuntimeConfig";

describe('RuntimeConfig.load', () => {
    let tempDir = "";
    beforeEach(() => { tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hompag-config-test-")); })
    afterEach(() => { fs.rmSync(tempDir, { recursive: true, force: true }); })

    const writeConfig = (content: string) => {
        const file = path.join(tempDir, "config.json");
        fs.writeFileSync(file, content);
        return file;
    }

    it('requires a store path', async () => {
        let error: unknown;
        await RuntimeConfig.load({}).catch(e => error = e);
        expect(error).instanceOf(ConfigError);
    });

    it('rejects the unedited template placeholder store path', async () => {
        let error: unknown;
        await RuntimeConfig.load({ overrides: { storePath: "[some path on my computer]" } }).catch(e => error = e);
        expect(error).instanceOf(ConfigError);
    });

    it('uses defaults for everything except the store path', async () => {
        const config = await RuntimeConfig.load({ overrides: { storePath: "/data" } });
        expect(config).deep.equal({
            storePath: "/data",
            port: 8101,
            spotify: { clientId: "", clientSecret: "" },
            axios: { apiKey: "" }
        });
    });

    it('layers legacy < file < PORT env < command line', async () => {
        const configPath = writeConfig(JSON.stringify({
            storePath: "/from-file",
            port: 9000,
            spotify: { clientId: "fileId" }
        }));
        const config = await RuntimeConfig.load({
            legacyLoader: async () => ({
                storePath: "/from-legacy",
                spotify: { clientId: "legacyId", clientSecret: "legacySecret" },
                axios: { apiKey: "legacyKey" }
            }),
            configPath,
            env: { PORT: "9100" },
            overrides: { storePath: "/from-cli" }
        });
        expect(config).deep.equal({
            storePath: "/from-cli",
            port: 9100,
            spotify: { clientId: "fileId", clientSecret: "legacySecret" },
            axios: { apiKey: "legacyKey" }
        });
    });

    it('ignores a missing or failing legacy config', async () => {
        const config = await RuntimeConfig.load({
            legacyLoader: async () => { throw new Error("Cannot find module './config'") },
            overrides: { storePath: "/data" }
        });
        expect(config.storePath).equal("/data");
    });

    it('accepts a file with a UTF-8 BOM', async () => {
        const configPath = writeConfig("﻿" + JSON.stringify({ storePath: "/bom" }));
        const config = await RuntimeConfig.load({ configPath });
        expect(config.storePath).equal("/bom");
    });

    it('reports a missing config file as a ConfigError', async () => {
        let error: unknown;
        await RuntimeConfig.load({ configPath: path.join(tempDir, "nope.json") }).catch(e => error = e);
        expect(error).instanceOf(ConfigError);
    });

    it('reports bad JSON as a ConfigError', async () => {
        let error: unknown;
        await RuntimeConfig.load({ configPath: writeConfig("{ not json") }).catch(e => error = e);
        expect(error).instanceOf(ConfigError);
        expect((error as Error).message).contains("not valid JSON");
    });

    it('rejects invalid ports', async () => {
        for (const port of ["0", "70000", "abc", "80.5"]) {
            let error: unknown;
            await RuntimeConfig.load({ env: { PORT: port }, overrides: { storePath: "/data" } }).catch(e => error = e);
            expect(error, `port ${port}`).instanceOf(ConfigError);
        }
    });
});
