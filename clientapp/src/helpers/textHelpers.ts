export function getUTCDateString(time: Date)
{
    let timeString = "";
    timeString +=       time.getUTCFullYear();
    timeString += "/" + time.getUTCMonth().toString().padStart(2,"0");
    timeString += "/" + time.getUTCDate()
    timeString += " " + time.getUTCHours().toString().padStart(2,"0");
    timeString += ":" + time.getUTCMinutes().toString().padStart(2,"0");
    timeString += ":" + time.getUTCSeconds().toString().padStart(2,"0");
    timeString += "." + time.getUTCMilliseconds().toString().padStart(3,"0");
    return timeString;
}

//------------------------------------------------------------------------------
// Trim anything from the start and end of a string
//------------------------------------------------------------------------------
export function trim(text: string, trimItems: string[] = [" ", "\r", "\t", "\n"]) { return trimChars(text, trimItems) }
export function trimStart(text: string, trimItems: string[] = [" ", "\r", "\t", "\n"]) { return trimChars(text, trimItems, true, false) }
export function trimEnd(text: string, trimItems: string[] = [" ", "\r", "\t", "\n"]) { return trimChars(text, trimItems, false, true) }

export function trimChars(text: string, trimItems: string[] = [" ", "\r", "\t", "\n"], trimStart: boolean = true, trimEnd: boolean = true )
{
    let output = text;
    let trimmedSomething = true;

    while(trimmedSomething && output !== "")
    {
        trimmedSomething = false;
        for(const item of trimItems)
        {
            if(trimStart && output.startsWith(item))
            {
                trimmedSomething = true;
                output = output.substr(item.length);
            }

            if(trimEnd && output.endsWith(item))
            {
                trimmedSomething = true;
                output = output.substr(0, output.length - item.length);
            }
        }
    }

    return output;
}

//------------------------------------------------------------------------------
// Simple and robust version comparison
// v1 > v2   => 1
// v1 == v2  => 0
// v1 < v2   => -1
//------------------------------------------------------------------------------
export function compareVersionStrings(version1: string, version2: string)
{
    version1 = trimChars(version1, ["."]);
    version2 = trimChars(version2, ["."]);
    const parts1 = version1.split(".");
    const parts2 = version2.split(".");
    for(let i = 0; i <  4; i++)
    {
        if(     (i >= parts1.length)  
            &&  (i >= parts2.length) )
        {
            return 0;   
        }
        let v1 = 0;
        let v2 = 0;
        if(i < parts1.length) v1 = parseInt(parts1[i])
        if(i < parts2.length) v2 = parseInt(parts2[i])

        if(v1 !== v2) { return v1 - v2 > 0? 1: -1}
    }
    return 0;
}

//------------------------------------------------------------------------------
// shortenString - cut the middle of a long string and replace with ...
//------------------------------------------------------------------------------
export function shortenString(maxLength: number, text: string, alternate: string)
{
    if(!text || text === "") text = alternate;
    if(text.length <= maxLength) return text;
    const chopLength = Math.floor((maxLength - 3)/2);
    const shortText = text.substring(0,chopLength) + "..." + text.substr(text.length-chopLength);
    return shortText;
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const weekdayNames_abbreviated = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "October", "November", "December"]
const monthNames_abbreviated = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Oct", "Nov", "Dec"]

// -------------------------------------------------------------------
// Tight formatting for date/time - Uses C# format syntax
// see: https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings
// -------------------------------------------------------------------
export function formatDateTime(date: Date, formatString: string = "MM/dd HH:mm")
{
    // Parts are any contiguous string of identical characters
    const parts = new Array<string>();
    let currentPart = "";
    for(let i = 0; i < formatString.length; i++){
        if(currentPart.length === 0 
            || formatString[i] === currentPart[0]) {
            currentPart += formatString[i];
        }
        else {
            parts.push(currentPart);
            currentPart = formatString[i];
        }
    }
    parts.push(currentPart);

    // helper to turn the fractions of a second into a string
    const fractionString = (length: number, nonZero: boolean) =>
    {
        const ms = date.getMilliseconds();
        if(nonZero && ms === 0) return "";
        const msString = ms.toString().padStart(3,"0") + "0000000";
        let returnString = msString.substr(0, length);
        if(nonZero) returnString = trimChars(msString, ["0"], false, true)
        return returnString;
    }

    let output = "";
    parts.forEach(p => {
        switch(p) {
            case "d":       output += date.getDate(); break;
            case "dd":      output += date.getDate().toString().padStart(2,"0"); break;
            case "ddd":     output += weekdayNames_abbreviated[date.getDay()]; break;
            case "dddd":    output += weekdayNames[date.getDay()]; break;
            case "h":       output += (date.getHours() % 12).toString(); break;      
            case "hh":      output += (date.getHours() % 12).toString().padStart(2,"0"); break;      
            case "H":       output += date.getHours().toString(); break;      
            case "HH":      output += date.getHours().toString().padStart(2,"0"); break;      
            case "m":       output += date.getMinutes(); break;
            case "mm":      output += date.getMinutes().toString().padStart(2,"0"); break;
            case "s":       output += date.getSeconds(); break;
            case "ss":      output += date.getSeconds().toString().padStart(2,"0"); break;
            case "M":       output += (date.getMonth() + 1); break;
            case "MM":      output += (date.getMonth() + 1).toString().padStart(2,"0"); break;
            case "MMM":     output += monthNames_abbreviated[date.getMonth()]; break;
            case "MMMM":    output += monthNames[date.getMonth()]; break;
            case "t":       output += date.getHours()>=12 ? "p": "a"; break;
            case "tt":      output += date.getHours()>=12 ? "pm": "am"; break;
            case "y":       
            case "yy":      output += (date.getFullYear() % 100).toString().padStart(2,"0"); break;
            case "yyy":      
            case "yyyy":    
            case "yyyyy":   output += date.getFullYear().toString().padStart(p.length,"0"); break;
            case "z":       output += date.getTimezoneOffset(); break;    
            case "zz":      output += date.getTimezoneOffset().toString().padStart(2,"0"); break;   
            // case "zzz":     ??? Hours and minutes offset
            case ":":       output += ":"; break; // SHould be localized as time separator
            case "/":       output += "/"; break; // SHould be localized as date separator
            case "f":        
            case "ff":      
            case "fff":     
            case "ffff":    
            case "fffff":   
            case "ffffff":   
            case "fffffff":   
            case "fffffffff": 
            case "F":       
            case "FF":      
            case "FFF":     
            case "FFFF":    
            case "FFFFF":   
            case "FFFFFF":   
            case "FFFFFFF":   
            case "FFFFFFFF": output += fractionString(p.length, p[0] === "F"); break;
            default: output += p; break;
        }
    })
    
    return output;
}   
