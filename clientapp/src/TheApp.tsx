// App Navigation handled here
import React from "react";
import { Provider } from "mobx-react";
import { AppModel } from "models/AppModel";
import { trimChars } from "helpers/textHelpers";
import { makeLocalStorage } from "models/LocalStorage";
import { BrowserRouter as Router } from "react-router-dom";
import { MainAppPage } from "views/MainAppPage";

const urlParts = trimChars(window.location.pathname, ['/']).split('/',2);
const pageName = urlParts[0];

export class TheApp 
extends React.Component<{}> 
{    
    appModel: AppModel;

    constructor(props: {}) {
        console.log("###### Construct TheApp")
        super(props);
        this.appModel = new AppModel(pageName, makeLocalStorage());
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        console.log("###### Render TheApp")
        return  <Provider appModel={this.appModel}> 
                    <Router>
                        <MainAppPage />
                    </Router>
                </Provider> 
    }
}
