

//-------------------------------------------------------------------------------
// Implement this interface to construct types for the parser
//-------------------------------------------------------------------------------
export interface ITypeHelper{
    // This return a clean construction for the specified type
    constructType(typeName: string): object;

    // Use this to exclude data from serialization
    shouldStringify(typeName: string, propertyName: string, object: any): boolean;
    
    // Use this to override how some data is reconstituted.  e.g.: turn a regular
    // array into an observable array.  Return the rehydrated object if there
    // is nothing to do. 
    reconstitute(typeName: string, propertyName: string, rehydratedObject: any): any;
}

export default class BruteForceSerializer
{
    private _objectCount = 0;
    private _typeHelper: ITypeHelper;

    //-------------------------------------------------------------------------------
    // ctor
    //-------------------------------------------------------------------------------
    constructor(typeHelper: ITypeHelper | null = null)
    {
        // use a default typehelper for normal serialization 
        if(!typeHelper) {
            typeHelper = {    
                constructType: (typeName: string) => null as unknown as object,
                shouldStringify: (typeName: string, propertyName: string, object: any) => true, 
                reconstitute: (typeName: string, propertyName: string, rehydratedObject: any) => rehydratedObject,
            }           
        }
        
        this._typeHelper = typeHelper;
    }

    //-------------------------------------------------------------------------------
    // Turn object into a JSON string 
    //-------------------------------------------------------------------------------
    stringify(object: any, compact: boolean = false)
    {
        const serializable = this.normalize(object); 
        if(compact) return JSON.stringify(serializable);
        else return JSON.stringify(serializable,null,2);
    }

    //-------------------------------------------------------------------------------
    // Turn any piece of data into something we can serialize with the built in 
    // JSON serializer.  We do this by accounting for references and removing type
    // specific junk. 
    //-------------------------------------------------------------------------------
    private normalize(object: any, lookup: Map<object, number> | null = null)
    {
        if(object === null) return null;
        const myType = typeof object;
        switch(myType)
        {
            case "boolean":
            case "number":
            case "string":
            case "bigint":
            case "symbol":      return object;
            case "object":      break;
            case "undefined":   return null;
            default:            return `Unhandled object type: ${myType}`
        }
        
        if(Array.isArray(object))
        {
            const arrayOut:any[] = []
            for(let i = 0; i < object.length; i++)
            {
                arrayOut.push(this.normalize(object[i],lookup))
            }
            return arrayOut;
        }

        if(!lookup) lookup = new Map<object, number>();

        // If we have seen the object already, then we return
        // a token to indicate the reference id
        if(lookup.has(object)) return `~~${lookup.get(object)}`

        // Each new object has an id and a type name
        // Obects can define __t as the typename if they want to avoid problems with minification
        const output:any = {
            __i: this._objectCount++,
            __t: object.__t ?? object.constructor?.name ?? "__unk__"
        };

        //console.log(`SERIALIZE: ${object.__t}, ${object.constructor?.name}, ${output.__t}`)

        // Remember that we have seen this object
        lookup.set(object,output.__i);

        // Maps are special = output kvp's as an array
        if(object instanceof Map) 
        {
            output.__kv = [];

            Array.from(object.keys()).forEach(k => 
                output.__kv.push( [this.normalize(k,lookup), this.normalize(object.get(k),lookup)])
            );
            return output;
        }

        // It's an object to handle the properties
        for(const propertyName in object)
        {
            if(!this._typeHelper.shouldStringify(output.__t, propertyName, object))
            {
                continue;
            } 

            const value = object[propertyName]
            // Don't serialize class code
            if(propertyName === "__proto__") continue;
            if (typeof value === 'function') continue;

            // Don't serialize if the value isn't there
            const normalized = this.normalize(value, lookup);
            if(normalized !== null) output[propertyName] = normalized;
        }
        return output;
    }

    //-------------------------------------------------------------------------------
    // Reconstruct our special json output into real objects
    //-------------------------------------------------------------------------------
    parse<T>(jsonText: string) {

        const stagedData = JSON.parse(jsonText);
        const lookup = new Map<number, object>();

        const parseData = (node: any) => {
            // Quick return on simple types
            switch(typeof node)
            {
                case "string":
                    // Strings that start with ~~ point to objects
                    if((node as string).match(/^~~/)) {
                        return lookup.get(parseInt((node as string).substr(2)))  
                    }
                    return node;
                case "number":
                case "boolean":
                case "bigint":
                case "undefined":
                    return node;
            }

            let nodeObject:any = null;

            // If this is an object, then construct it.
            if(node.__i !== undefined)
            {
                switch(node.__t)
                {
                    // MapTypes are special
                    case "Map": 
                        const outputMap = new Map();
                        for(let i = 0; i < node.__kv.length; i++)
                        {
                            const key = parseData(node.__kv[i][0])
                            const value = parseData(node.__kv[i][1])
                            outputMap.set(key,value)
                        }
                        return outputMap;
                    case "Object":
                        nodeObject = {};
                        break;
                    default:
                        nodeObject = this._typeHelper.constructType(node.__t) as any;
                        if(!nodeObject) throw Error(`Type helper was unable to construct object of type '${node.__t}' on id ${node.__i}`);
                        break;
                }
                lookup.set(node.__i, nodeObject); 
            }

            // Arrays are special
            if(Array.isArray(node))
            {
                const arrayOut:any[] = []
                for(let i = 0; i < node.length; i++)
                {
                    arrayOut.push(parseData(node[i]))
                }
                return arrayOut;
            }
    
            // Now we are a regular object, so handle properties
            for(const propertyName in node)
            {
                // ignore utility properties
                switch(propertyName)
                {
                    case "__i":
                    case "__t":
                    case "__kv":
                                continue;
                }
                const data = parseData(node[propertyName]);
                nodeObject[propertyName] = this._typeHelper.reconstitute( node.__t, propertyName, data );
            }
            return nodeObject;
        }

        return parseData(stagedData) as T;
    }
}
