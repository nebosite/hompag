var fetch = require('node-fetch')

export async function restCall<T>(
    method: string, 
    headers: any, 
    endpoint:string , 
    body:string | undefined = undefined) {
    
    if(body) {
        headers['Content-Length'] = body.length
    }

    const options = {method,headers,body}
    // console.log("FETCH:")
    // console.log(`    ${endpoint}`)
    // console.log(`    ${JSON.stringify(options)}`)

    return fetch(endpoint, options)
            .then((response:any) =>   response.json()) as T
}
