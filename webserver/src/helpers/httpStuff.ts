export function objectToUriParams(paramifyMe: any)
{
    let output = "";
    for(let propertyName in paramifyMe)
    {
        output += `${(output.length > 0 ? '&': '')}${propertyName}=${paramifyMe[propertyName]}`
    }
    return output;
}
