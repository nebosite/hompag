import fetch from 'cross-fetch';

//------------------------------------------------------------------------------------------
// restCall
//------------------------------------------------------------------------------------------
export async function restCall<T>(
    method: string, 
    headers: any, 
    endpoint:string , 
    body:string | undefined = undefined) 
{
    const textResponse = await restCallText(method, headers, endpoint, body);
    if(!textResponse) return null;
    return JSON.parse(textResponse) as T
}

//------------------------------------------------------------------------------------------
// restCallText - No transformation of output
//------------------------------------------------------------------------------------------
export async function restCallText(
    method: string, 
    headers: any, 
    endpoint:string , 
    body:string | undefined = undefined) {
    
    if(body) {
        headers['Content-Length'] = body.length
    }

    const options = {method,headers,body}

    return fetch(endpoint, options)
            .then(async (response) =>  {
                if(response.status === 204) return null;
                return (await response.text()) as string
            } ) ?? ""
}
