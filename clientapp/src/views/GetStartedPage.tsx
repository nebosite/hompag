// App Navigation handled here
import React from "react";
import { observer } from "mobx-react";
import styles from '../AppStyles.module.css';

import { GetStartedModel } from "models/GetStartedModel";


@observer
export class GetStartedPage 
extends React.Component<{context: GetStartedModel}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;    
        return ( 
            <div className={styles.mainPage}>
                <div>Welcome to hompag</div> 
                <div>Known pages:</div>
                { context.pages 
                    ? context.pages.map(p => <div key={p}><a href={`/${p}`}>{p}</a></div>) 
                    : <div>No Pages...</div>
                }
            </div>        
        );
    }
}
