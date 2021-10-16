import { observer } from "mobx-react";
import React, { CSSProperties } from "react";
import styles from './DialogControl.module.css';

export interface DialogControlProps {
    style?: CSSProperties;
    className?: string;
}

@observer
export class DialogControl
extends React.Component<DialogControlProps>
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        return <div className={`${styles.dialogControl} ${this.props.className}`} style={this.props.style}>
            {this.props.children}
        </div>
    };
}
