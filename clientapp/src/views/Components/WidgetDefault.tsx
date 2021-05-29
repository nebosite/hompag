import { observer } from "mobx-react";
import { PageItem } from "models/PageModel";
import React from "react";

@observer
export default class WidgetDefault 
extends React.Component<{pageItem: PageItem}> 
{    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        return (
            <div>
                Lorem Ipsum <a href="http://google.com">Link here</a> wow.<br/>
                twas brilling and the slithy toves<br/>
                Did gyre and gimble in the wabe<br/>
                all mimsy were the borogroves<br/>
                and the momewraths outgrabe
            </div> 
        );
    };
}