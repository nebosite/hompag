// App Navigation handled here
import React from "react";
import { inject, observer } from "mobx-react";
import styles from './AppStyles.module.css';
import { AppModel } from "models/AppModel";
import '../../node_modules/react-grid-layout/css/styles.css'
import '../../node_modules/react-resizable/css/styles.css'
import GridLayout from 'react-grid-layout';

@inject("appModel")
@observer
export class MainAppPage 
extends React.Component<{appModel?: AppModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
  render() {
    const layout = [
        {i: 'a', x: 0, y: 0, w: 1, h: 2, static: true},
        {i: 'b', x: 1, y: 0, w: 3, h: 2, minW: 2, maxW: 4},
        {i: 'c', x: 4, y: 0, w: 1, h: 2}
      ];

    return (
      <div className={styles.MainAppPage}>
         <GridLayout className="layout" layout={layout} cols={12} rowHeight={30} width={1200}>
            <div key="a" style={{background: "white"}}>a</div>
            <div key="b" style={{background: "white"}}>b</div>
            <div key="c" style={{background: "white"}}>c</div>
        </GridLayout>
      </div>
    );
  };
}
