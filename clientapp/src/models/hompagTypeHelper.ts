import { ITypeHelper } from "helpers/BruteForceSerializer";

const knownTypes = new Map<string, (itemBag: Map<string,any>) => object>()
export const registerType = (typeName: string, instantiator: (itemBag: Map<string,any>) => object) => {
    knownTypes.set(typeName, instantiator);
}

const knownProperties = new Map<string, (typeName: string, propertyName: string, rehydratedObject: any) => object>()
const propertyKey = (typeName: string, propertyName: string) => `${typeName}::${propertyName}}`
export const registerProperty = (typeName: string, propertyName: string, instantiator: (typeName: string, propertyName: string, rehydratedObject: any) => object) => {
    knownProperties.set(propertyKey(typeName, propertyName), instantiator);
}

const globalItems = new Map<string, any>();
export const registerGlobalItem = (key: string, value: any) =>
{
    globalItems.set(key, value);
}

export class hompagTypeHelper implements ITypeHelper
{
    constructType(typeName: string): object {
        if(knownTypes.has(typeName)) {
            return knownTypes.get(typeName)(globalItems);
        }
        else throw Error(`Tried to construct unknown type: ${typeName}`)
    }

    shouldStringify(typeName: string, propertyName: string, object: any): boolean {
        if(propertyName.startsWith("ref_")) return false;
        if(propertyName.startsWith("state_")) return false;
        if(propertyName.startsWith("_ref_")) return false;
        if(propertyName.startsWith("_state_")) return false;
        if((typeName === "WidgetModel" || typeName === "PageModel") && propertyName === "version") return false;
        return true;
    }

    reconstitute(typeName: string, propertyName: string, rehydratedObject: any) {
        const key = propertyKey(typeName, propertyName);
        if(knownProperties.has(key)) {
            return knownProperties.get(key)(typeName, propertyName, rehydratedObject);
        }
        else return rehydratedObject;
    }

}