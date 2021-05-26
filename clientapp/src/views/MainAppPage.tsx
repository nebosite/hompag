// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import styles from './AppStyles.module.css';
import { AppModel } from "models/AppModel";


@inject("appModel")
@observer
export class MainAppPage 
extends React.Component<{appModel?: AppModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
  render() {
    return (
      <div className={styles.MainAppPage}>
          th hompag
      </div>
    );
  };
}
