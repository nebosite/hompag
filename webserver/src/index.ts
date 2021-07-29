import express from 'express';
import * as path from 'path';
import { getPage, getPages, storePage } from './apis/pages';
import { showHealth } from './apis/showHealth';
import { Logger } from './helpers/logger';
import { PageAccessLocalDisk } from './models/PageAccessLocalDisk';
import { ServerModel } from './models/ServerModel';
import {hompag_config} from './config'
import { getWidget, storeWidget } from './apis/widgets';


// ---------------------------------------------------------------------------------
// GLOBAL OBJECTS
// ---------------------------------------------------------------------------------
const port = process.env.PORT || 8101
export const app = express();
export const logger = new Logger();
export const serverModel = new ServerModel(logger, new PageAccessLocalDisk(logger, hompag_config.localStoreLocation));
export const VERSION = require('./version');

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


// ---------------------------------------------------------------------------------
// app hosting
// ---------------------------------------------------------------------------------
const clientAppRoot = process.env.ISDEV 
    ? path.join(__dirname, "../../clientapp/build/")
    : path.join(__dirname, "clientapp/")
//const clientAppRoot = path.join(__dirname, "../../clientapp/build/")

logger.logLine(`Client root = ${clientAppRoot}`)

app.get('', (req, res) => { res.sendFile(`${clientAppRoot}/index.html`); })
app.use('/', express.static(clientAppRoot));
app.get('/*', (req, res) => { res.sendFile(`${clientAppRoot}/index.html`); })

// ---------------------------------------------------------------------------------
// Listen up!
// ---------------------------------------------------------------------------------

app.listen(port, () => {
    logger.logLine('listening on ' + port);
});

