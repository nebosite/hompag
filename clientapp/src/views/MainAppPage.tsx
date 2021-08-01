// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import styles from './AppStyles.module.css';
import { AppModel } from "models/AppModel";
import { PageControl } from "./Components/PageControl";


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

    return ( 
        <div className={styles.mainPage}>
            {appModel.page 
                ? <PageControl pageModel={appModel.page} />
                : <div>Loading... </div>}
            
        </div>        
    );
  }
}
