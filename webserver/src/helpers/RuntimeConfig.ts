import * as fs from 'fs';

// ---------------------------------------------------------------------------------
// The complete server configuration
// ---------------------------------------------------------------------------------
export interface HompagConfig {
    storePath: string
    port: number
    spotify: {
        clientId: string
        clientSecret: string
    }
    axios: {
        apiKey: string
    }
}

export class ConfigError extends Error {}

export interface RuntimeConfigSources {
    /** Path to a JSON config file (from HOMPAG_CONFIG or config=) */
    configPath?: string
    /** Loads the legacy compiled-in config.ts, if present */
    legacyLoader?: () => Promise<Partial<HompagConfig> | undefined>
    /** Environment (PORT is honored) */
    env?: { [name: string]: string | undefined }
    /** Command-line overrides */
    overrides?: Partial<HompagConfig>
}

// ---------------------------------------------------------------------------------
// Builds the server configuration at runtime, so that prebuilt releases never
// contain secrets.  Precedence (lowest to highest):
//    defaults < legacy config.ts < JSON config file < PORT env < command line
// ---------------------------------------------------------------------------------
export class RuntimeConfig {

    static readonly DEFAULT_PORT = 8101;

    // ---------------------------------------------------------------------------------
    // Defaults with no secrets.  Widgets that need keys simply won't work.
    // ---------------------------------------------------------------------------------
    static defaults(): HompagConfig {
        return {
            storePath: "",
            port: RuntimeConfig.DEFAULT_PORT,
            spotify: { clientId: "", clientSecret: "" },
            axios: { apiKey: "" }
        }
    }

    // ---------------------------------------------------------------------------------
    // Assemble the config from all sources and validate it
    // ---------------------------------------------------------------------------------
    static async load(sources: RuntimeConfigSources): Promise<HompagConfig> {
        let config = RuntimeConfig.defaults();

        if (sources.legacyLoader) {
            const legacy = await sources.legacyLoader().catch(() => undefined);
            if (legacy) config = RuntimeConfig.merge(config, legacy);
        }

        if (sources.configPath) {
            config = RuntimeConfig.merge(config, RuntimeConfig.readJsonFile(sources.configPath));
        }

        const envPort = sources.env?.PORT;
        if (envPort) config.port = RuntimeConfig.parsePort(envPort, "PORT environment variable");

        if (sources.overrides) config = RuntimeConfig.merge(config, sources.overrides);

        RuntimeConfig.validate(config);
        return config;
    }

    // ---------------------------------------------------------------------------------
    // Read a JSON config file, with friendly errors
    // ---------------------------------------------------------------------------------
    static readJsonFile(configPath: string): Partial<HompagConfig> {
        let text: string;
        try {
            text = fs.readFileSync(configPath, "utf8");
        } catch (err) {
            throw new ConfigError(`Could not read config file '${configPath}': ${(err as Error).message}`);
        }
        try {
            // Strip a UTF-8 BOM, which Windows editors like to add
            return JSON.parse(text.replace(/^﻿/, ""));
        } catch (err) {
            throw new ConfigError(`Config file '${configPath}' is not valid JSON: ${(err as Error).message}`);
        }
    }

    // ---------------------------------------------------------------------------------
    // Overlay the known keys of overlay onto base.  Unknown keys are ignored.
    // ---------------------------------------------------------------------------------
    static merge(base: HompagConfig, overlay: Partial<HompagConfig>): HompagConfig {
        const result: HompagConfig = {
            ...base,
            spotify: { ...base.spotify },
            axios: { ...base.axios }
        }
        if (overlay.storePath !== undefined) result.storePath = overlay.storePath;
        if (overlay.port !== undefined) result.port = RuntimeConfig.parsePort(overlay.port, "port");
        if (overlay.spotify) {
            if (overlay.spotify.clientId !== undefined) result.spotify.clientId = overlay.spotify.clientId;
            if (overlay.spotify.clientSecret !== undefined) result.spotify.clientSecret = overlay.spotify.clientSecret;
        }
        if (overlay.axios?.apiKey !== undefined) result.axios.apiKey = overlay.axios.apiKey;
        return result;
    }

    // ---------------------------------------------------------------------------------
    // Ports must be integers in range
    // ---------------------------------------------------------------------------------
    static parsePort(value: string | number, source: string): number {
        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new ConfigError(`Invalid ${source}: '${value}'`);
        }
        return port;
    }

    // ---------------------------------------------------------------------------------
    // Throw a ConfigError if the config can't possibly work
    // ---------------------------------------------------------------------------------
    static validate(config: HompagConfig) {
        if (!config.storePath || config.storePath.startsWith("[")) {
            throw new ConfigError("No store path configured. Set storePath in the config file, "
                + "or pass storepath=<folder> on the command line.");
        }
    }
}
