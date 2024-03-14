import express_ws from 'express-ws';
import * as path from 'path';
import { getPage, getPages, storePage } from './apis/pages';
import { ServerModel } from './models/ServerModel';
import {hompag_config} from './config'
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
import { listening_port, VERSION } from './GLOBALS';
import cors from 'cors'
import { handleRefresh } from './apis/refresh';

// Process Arguments
const args = process.argv.slice(2);
for(let arg of args)
{
    const parts = arg.split('=',2);
    const name = parts[0].toLowerCase()
    console.log(`Processing argument ${name} ${parts[1]}`)
    switch(parts[0].toLowerCase()) {
        case "killpath": killpath = parts[1]; break;
        case "storepath": hompag_config.storePath = parts[1]; break;
        default: throw Error(`bad argument: ${arg}`)
    }
    if(parts[0].toLowerCase() === "killpath") {
      killpath = parts[1];
    }
}

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

var killpath = undefined;

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
app.get("/api/die", ()=> process.exit(55))

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
const __dirname = path.resolve();
const clientAppRoot = process.env.ISDEV === "1"
    ? path.join(__dirname, "../clientapp/build/")
    : "clientapp"

logger.logLine(`Client root = ${clientAppRoot}`)
app.get('', (req: any, res: any) => { res.sendFile(`${clientAppRoot}/index.html`); })
app.use('/', express.static(clientAppRoot));
app.get('/*', (req: any, res: any) => { res.sendFile(`${clientAppRoot}/index.html`); }) 

const handleShutdown = async (signal: any) => { 
    logger.logLine(`B'Bye: ${signal} `)
    logger.logLine("Attempting to shut down gracefully...   ")
    await pageAccess.flushRecents(0, Date.now() + 1000000000) 
    logger.logLine("Done ------------------------------------------")
    process.exit(0);
}

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
process.on('SIGHUP', handleShutdown);
process.on('SIGUSR2', handleShutdown);

process.on('exit', async () => {
   
    setTimeout(()=> process.exit(0), 3000)
});


// ---------------------------------------------------------------------------------
// Listen up!
// ---------------------------------------------------------------------------------

app.listen(listening_port, () => {
    logger.logLine('listening on ' + listening_port);
});


