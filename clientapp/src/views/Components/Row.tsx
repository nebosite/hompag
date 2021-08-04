import React from "react"

export default class Row extends React.Component<{className?: string, style?: any, onClick?: (e: any) => void}>
{
    render()
    {

        return <div 
                className={this.props.className} 
                style={this.props.style} 
                onClick={this.props.onClick}> 
            {
                React.Children.map(this.props.children, c => {
                    return <div style={{display:"inline-block"}}>{c}</div>
                })
            }
            </div>
    }
} 
