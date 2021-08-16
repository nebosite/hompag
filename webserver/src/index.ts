import express from 'express';
import express_ws from 'express-ws';
import * as path from 'path';
import { getPage, getPages, storePage } from './apis/pages';
import { showHealth } from './apis/showHealth';
import { Logger } from './helpers/logger';
import { PageAccessLocalDisk } from './models/PageAccessLocalDisk';
import { ServerModel } from './models/ServerModel';
import {hompag_config} from './config'
import { getWidget, storeWidget } from './apis/widgets';
import { handleSocket } from './apis/handleSocket';
import { VERSION } from './GLOBALS';
import { PageCache } from './models/PageCache';
import { handleQueries } from './apis/query';


// ---------------------------------------------------------------------------------
// GLOBAL OBJECTS
// ---------------------------------------------------------------------------------
const port = process.env.PORT || 8101
export const app = express();
const app_ws = express_ws(app);
const logger = new Logger();
const pageAccess = new PageCache(
    new PageAccessLocalDisk(hompag_config.localStoreLocation, logger),
    logger
)
export const serverModel = new ServerModel(pageAccess, logger);

logger.logLine("##################################################################################")
logger.logLine("## Starting hompag Server  v" + VERSION)

var killpath = undefined;

// Process Arguments
const args = process.argv.slice(2);
for(let arg of args)
{
    const parts = arg.split('=',2);
    if(parts[0].toLowerCase() === "killpath") {
      killpath = parts[1];
    }
}

// Set up kill path as first processor.  Invoking the server with the killpath
// specified allows testing logic to easily start and stop the server during tests
if(killpath) {
    logger.logLine("**** Setting kill path to /" + killpath + " ****")
    app.get("/" + killpath, (req, res) => {
        logger.logLine("Server was killed with killpath")
        res.end("Arrrgh!")
        process.exit(0);
    });
}

app.use(express.text({type: "application/json"}));
// app.use(express.urlencoded({
//   extended: true
// }));

// ---------------------------------------------------------------------------------
// REST APIs / socket apis
// ---------------------------------------------------------------------------------
app.get("/api/am_i_healthy", showHealth);

app.post("/api/pages/:id", storePage(logger))
app.get("/api/pages/:id", getPage(logger))
app.get("/api/pages", getPages(logger))
app.post("/api/widgets/:id", storeWidget(logger))
app.get("/api/widgets/:id", getWidget(logger))
app.get("/api/query", handleQueries(logger))

app_ws.app.ws('/subscribe', (req, res) => handleSocket(req, res, logger));

// ---------------------------------------------------------------------------------
// app hosting
// ---------------------------------------------------------------------------------
const clientAppRoot = path.join(__dirname, "../../clientapp/build/")

logger.logLine(`Client root = ${clientAppRoot}`)

app.get('', (req, res) => { res.sendFile(`${clientAppRoot}/index.html`); })
app.use('/', express.static(clientAppRoot));
app.get('/*', (req, res) => { res.sendFile(`${clientAppRoot}/index.html`); })

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

// process.on('exit', async () => {
   
//     setTimeout(()=> process.exit(0), 3000)
// });


// ---------------------------------------------------------------------------------
// Listen up!
// ---------------------------------------------------------------------------------

app.listen(port, () => {
    logger.logLine('listening on ' + port);
});


