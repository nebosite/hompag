import ReactDOM from "react-dom";
import { trimChars } from "helpers/textHelpers";
import { GetStartedModel } from "models/GetStartedModel";
import { GetStartedPage } from "views/GetStartedPage";
import { TheApp } from "TheApp";
const packageInfo = require("../package.json");
export class GLOBALS {
    static Version = packageInfo.version;
    static Title = `hompag ${(process.env.NODE_ENV === "development") ? "DEV": "" } ${GLOBALS.Version} `;
    static renderCount = 0
}

const autoRedirect = window.sessionStorage.getItem("autoredirect");
if( autoRedirect){
    console.log(`Redirection to: ${autoRedirect}`)
    window.sessionStorage.removeItem("autoredirect")
    setTimeout(()=>{window.location.href = autoRedirect},10)
}

window.addEventListener('keydown', (event: any) => {

    if(event.ctrlKey && event.keyCode === 83) { 
      console.log("Ctrl+S event captured!");
      event.preventDefault(); 
    }
  });

const urlParts = trimChars(window.location.pathname, ['/']).split('/',2);
const pageName = urlParts[0];
document.title = (pageName ?? "(picking)") + ": " + GLOBALS.Title ;
if(pageName === "")
{
    const getStartedModel = new GetStartedModel();
    ReactDOM.render(
        <GetStartedPage context={getStartedModel} />
        ,document.getElementById("root") 
    );     

}
else {
    (async()=>{
        console.log("========================= REFRESH ======================================")
        ReactDOM.render(<TheApp />, document.getElementById("root"));
    })()

}
