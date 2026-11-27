import express_ws from 'express-ws';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getPage, getPages, storePage } from './apis/pages';
import { ServerModel } from './models/ServerModel';
import { PageCache } from './models/PageCache';
import { PageAccessLocalDisk } from './models/PageAccessLocalDisk';
import { Logger } from './helpers/logger';
import express from 'express';
import { showHealth } from './apis/showHealth';
import { getWidget, storeWidget } from './apis/widgets';
import { handleQueries } from './apis/query';
import { executeAction, getActionList } from './apis/actions';
import { handleSpotifyCommand } from './apis/spotify';
import { handleLoginResponse } from './apis/loginResponder';
import { handlePingCommand } from './apis/ping';
import { getStockData } from './apis/stock';
import { handleSocket } from './apis/handleSocket';
import { listening_port, setListeningPort, VERSION } from './GLOBALS';
import cors from 'cors'
import { handleRefresh } from './apis/refresh';
import { HompagConfig, RuntimeConfig, ConfigError } from './helpers/RuntimeConfig';
import { ShutdownCoordinator } from './helpers/ShutdownCoordinator';
import { HompagExitCode } from 'hompag-common';

// Process Arguments
let killpath: string | undefined = undefined;
const overrides: Partial<HompagConfig> = {}
let configPath = process.env.HOMPAG_CONFIG
const args = process.argv.slice(2);
for(let arg of args)
{
    const parts = arg.split('=',2);
    const name = parts[0].toLowerCase()
    console.log(`Processing argument ${name} ${parts[1]}`)
    switch(name) {
        case "killpath": killpath = parts[1]; break;
        case "storepath": overrides.storePath = parts[1]; break;
        case "config": configPath = parts[1]; break;
        default:
            console.error(`bad argument: ${arg}`)
            process.exit(HompagExitCode.ConfigError)
    }
}

// Load the config at runtime so that prebuilt releases don't contain secrets.
// A legacy compiled-in config.ts is still honored if it exists.
let hompag_config: HompagConfig
try {
    hompag_config = await RuntimeConfig.load({
        configPath,
        overrides,
        env: process.env,
        legacyLoader: async () => (await import("./" + "config"))?.hompag_config
    })
} catch(err) {
    console.error(`CONFIGURATION ERROR: ${(err as Error).message}`)
    process.exit(err instanceof ConfigError ? HompagExitCode.ConfigError : HompagExitCode.Crash)
}
setListeningPort(hompag_config.port)

// ---------------------------------------------------------------------------------
// GLOBAL OBJECTS
// ---------------------------------------------------------------------------------
export const app = express();
const app_ws = express_ws(app);
app.use(cors());
const logger = new Logger();

const pageAccess = new PageCache(
    new PageAccessLocalDisk(hompag_config.storePath, logger),
    logger
)
export const serverModel = new ServerModel(hompag_config, pageAccess, logger);

logger.logLine("##################################################################################")
logger.logLine("## Starting hompag Server  v" + VERSION)

// Set up kill path as first processor.  Invoking the server with the killpath
// specified allows testing logic to easily start and stop the server during tests
if(killpath) {
    logger.logLine("**** Setting kill path to /" + killpath + " **** ")
    app.get("/" + killpath, (req: any, res: any) => {
        logger.logLine("Server was killed with killpath")

        res.end("Arrrgh!")
        process.exit(0);
    });
}

app.use(express.text({type: "application/json"}));

// ---------------------------------------------------------------------------------
// REST APIs / socket apis
// ---------------------------------------------------------------------------------
app.get("/api/am_i_healthy", showHealth);
if(process.env.ISDEV === "1" || process.env.HOMPAG_ALLOW_DIE === "1") {
    // Simulated crash, for testing the supervisor
    app.get("/api/die", ()=> process.exit(HompagExitCode.TestDie))
}

app.post("/api/pages/:id", storePage(logger))
app.get("/api/pages/:id", getPage(logger))
app.get("/api/pages", getPages(logger))

app.get("/api/refresh", handleRefresh(logger))

app.post("/api/widgets/:id", storeWidget(logger))
app.get("/api/widgets/:id", getWidget(logger))

app.get("/api/query", handleQueries(logger))

app.get("/api/actions/list", getActionList(logger))
app.put("/api/actions/execute/:actionName", executeAction(logger))

app.post("/api/spotify/:command", handleSpotifyCommand(logger))
app.get("/api/loginresponder/:app", handleLoginResponse(logger))

app.post("/api/ping", handlePingCommand(logger))

app.post("/api/stock/:symbol", getStockData(logger))

app_ws.app.ws('/subscribe', (req, res) => handleSocket(req, res, logger));

// ---------------------------------------------------------------------------------
// app hosting
// ---------------------------------------------------------------------------------
// Resolve the client relative to this script, not the working directory:
//   dev (tsx):  webserver/src/index.ts     -> clientapp/build
//   release:    <release>/server/index.mjs -> <release>/clientapp
// HOMPAG_CLIENT_DIR overrides both.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientAppRoot = process.env.HOMPAG_CLIENT_DIR
    ? path.resolve(process.env.HOMPAG_CLIENT_DIR)
    : (process.env.ISDEV === "1"
        ? path.join(scriptDir, "../../clientapp/build")
        : path.join(scriptDir, "../clientapp"))

logger.logLine(`Client root = ${clientAppRoot}`)
app.get('', (req: any, res: any) => { res.sendFile(path.join(clientAppRoot, "index.html")); })
app.use('/', express.static(clientAppRoot));
app.get('/*', (req: any, res: any) => { res.sendFile(path.join(clientAppRoot, "index.html")); })

// Signals, supervisor shutdown requests, and unhandled errors all flush
// cached pages to disk before the process exits.
const shutdownCoordinator = new ShutdownCoordinator(logger,
    () => pageAccess.flushRecents(0, Date.now() + 1000000000))
shutdownCoordinator.install();

// ---------------------------------------------------------------------------------
// Listen up!
// ---------------------------------------------------------------------------------

const server = app.listen(listening_port, () => {
    logger.logLine('listening on ' + listening_port);
});
// express-ws's WebSocketServer re-emits server errors; without a listener
// that would surface as an uncaught exception.  The server handler below owns them.
app_ws.getWss().on('error', () => {});
server.on('error', (err: NodeJS.ErrnoException) => {
    if(err.code === 'EADDRINUSE') {
        logger.logError(`Port ${listening_port} is already in use.  Is hompag already running?`)
        process.exit(HompagExitCode.PortInUse)
    }
    shutdownCoordinator.crash("Server error", err)
});
