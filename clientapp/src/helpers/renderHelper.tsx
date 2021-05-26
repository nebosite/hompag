import React from "react";

export class RenderHelper
{
    // -------------------------------------------------------------------
    // Get a kosher anchor that links out to another tab
    // -------------------------------------------------------------------
    static safeLink(link: string, text:string, style:any = null)
    {
        if(!link) {
            if(style) style.color = "gray";
            return  <div style={style}> {text} </div>
        }
      

        // FOr local debugging, need to handle links in different ways
        if(link.match(/^(http:|https:)/i)) {
            // Leave alone full html 
        }
        else if(link.startsWith("mailto:")){
            // Don't remap mailto
        }
        else {
            link = `${process.env.PUBLIC_URL}/${link}`;
        }

        return (  <React.Fragment>
                  <a 
                    href={link} 
                    target='_blank' 
                    rel="noopener noreferrer" 
                    style={style ?? {padding: "1px"}}>
                      {text}
                  </a>
                </React.Fragment>)
    }

    // -------------------------------------------------------------------
    // Tight formatting for date/time
    // -------------------------------------------------------------------
    static formattedDateTime(date: Date)
    {
      let month = (date.getMonth() + 1).toString().padStart(2,"0");
      let day = date.getDate().toString().padStart(2,"0");
      let hour = date.getHours().toString().padStart(2,"0");
      let minute = date.getMinutes().toString().padStart(2,"0");
      let second = date.getSeconds().toString().padStart(2,"0");
      return `${month}-${day} ${hour}:${minute}:${second}`
    }   
}