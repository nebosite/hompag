import { observer } from "mobx-react";
import React from "react";



export interface SafeLinkProperties
{
    link: string
    text:string | number | JSX.Element
    style?: React.CSSProperties 
    openInNewTab?: boolean
}

// -------------------------------------------------------------------
// SearchPage
// -------------------------------------------------------------------
@observer
export default class SafeLink 
extends React.Component<SafeLinkProperties> {

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {link, text, style, openInNewTab} = this.props;

        if(!link) return  <div style={{...style, color: "gray"}}> {text} </div>

        const linkStyle = {padding: "1px", ...style}
        return (openInNewTab ?? false)
            ? <a style={linkStyle} href={link} target="_blank" rel="noopener noreferrer"> {text} </a>
            : <a style={linkStyle} href={link}> {text} </a>
    }
}
