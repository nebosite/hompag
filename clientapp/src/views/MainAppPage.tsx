// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import styles from '../AppStyles.module.css';
import { AppModel } from "models/AppModel";
import { PageControl } from "../Components/PageControl";
import Row from "../Components/Row";
import { GLOBALS } from "index";


@inject("appModel")
@observer
export class MainAppPage 
extends React.Component<{appModel?: AppModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // Docs on grid layout:  https://www.npmjs.com/package/react-grid-layout
  // -------------------------------------------------------------------
  render() {
    const {appModel} = this.props;
    GLOBALS.renderCount++;
    return ( 
        <div className={styles.mainPage} id="__the_main_page__" >
            {appModel.recentError
                ?   <Row>
                        <div style={{background: "red", color: "yellow"}}>Background Error: {appModel.recentError}</div>
                        <button onClick={()=>appModel.recentError = undefined}>dismiss</button>
                    </Row>
                : null}
            {appModel.lostConnection
                ?   <Row>
                        <div style={{background: "red", color: "yellow"}}>Lost connection with server {appModel.recentError}</div>
                        <button onClick={()=>appModel.connectToServer()}>Reconnect</button>
                    </Row>
                : null}
            {appModel.page 
                ? <PageControl pageModel={appModel.page} />
                : <div>Loading... </div>}
            
        </div>        
    );
  }
}
