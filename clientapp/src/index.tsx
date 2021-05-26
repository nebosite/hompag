import { Provider } from "mobx-react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { MainAppPage } from "views/MainAppPage";
import { AppModel } from "models/AppModel";
const packageInfo = require("../package.json");
export class GLOBALS {
     static Version = packageInfo.version;
     static Title = `CrashCow ${(process.env.NODE_ENV === "development") ? "DEV": "" } ${GLOBALS.Version} `;
}

document.title = GLOBALS.Title;
const theAppModel:AppModel = new AppModel();

ReactDOM.render(
    // to provide reactivity via mobx
    <Provider appModel={theAppModel}> 
        <Router>
            <MainAppPage />
        </Router>
    </Provider>,
    document.getElementById("root")
);     
