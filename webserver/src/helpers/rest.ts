var fetch = require('node-fetch')

export function restCall<T>(method: string, headers: any, endpoint:string , body:string = ""): T {
    
    headers['Content-Length'] = body.length

    const options = {method,headers,body}
    console.log("FETCH:")
    console.log(`    ${endpoint}`)
    console.log(`    ${JSON.stringify(options)}`)
    return fetch(endpoint, options)
        .then((response:any) => { return response.json() as T })
}