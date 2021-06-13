import { Provider } from "mobx-react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { MainAppPage } from "views/MainAppPage";
import { AppModel } from "models/AppModel";
import { trimChars } from "helpers/textHelpers";
import { GetStartedModel } from "models/GetStartedModel";
import { GetStartedPage } from "views/GetStartedPage";
const packageInfo = require("../package.json");
export class GLOBALS {
     static Version = packageInfo.version;
     static Title = `hompag ${(process.env.NODE_ENV === "development") ? "DEV": "" } ${GLOBALS.Version} `;
}

document.title = GLOBALS.Title;


const urlParts = trimChars(window.location.pathname, ['/']).split('/',2);
const pageName = urlParts[0];
if(pageName === "")
{
    const getStartedModel = new GetStartedModel();
    ReactDOM.render(
        <GetStartedPage context={getStartedModel} />
        ,document.getElementById("root")
    );     

}
else {
    const theAppModel:AppModel = new AppModel(pageName);

    ReactDOM.render(
        <Provider appModel={theAppModel}> 
            <Router>
                <MainAppPage />
            </Router>
        </Provider>,
        document.getElementById("root")
    );     

}
