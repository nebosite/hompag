import React from "react"

export interface RowProps {
    className?: string
    style?: React.CSSProperties  
    wrap?: boolean
}

export default class Row extends React.Component<RowProps>
{
    render()
    {
        const style: React.CSSProperties = {
            display: "flex",
            alignItems: "center",

            ...this.props.style
        }

        if(this.props.wrap) style.flexWrap = "wrap";

        return <div className={this.props.className} style={style}> 
            {this.props.children}
        </div>
    }
}  
