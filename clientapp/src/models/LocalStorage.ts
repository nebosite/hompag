

// -------------------------------------------------------------------
// Interface for storing locally somehow
// -------------------------------------------------------------------
export interface ILocalStorage {
    loadObject: <T>(key: string) => Promise<T | null>;
    saveObject: (key: string, saveMe: object) => Promise<void>;
    removeObject: (key: string) => Promise<void>;
    clear: () => Promise<void>;
};


// -------------------------------------------------------------------
// Factory method for storage
// -------------------------------------------------------------------
export function makeLocalStorage(): ILocalStorage
{
    if (!window.indexedDB) {
        console.log("Using localStorage");
        return new LocalStorageBasic();
    }
    else {
        console.log("Using IndexedDB storage");
        return new LocalStorageIndexedDB();
    }
}

//------------------------------------------------------------------------------
// nodejs localStorage is simple, but limited in size
//------------------------------------------------------------------------------
class LocalStorageBasic implements ILocalStorage {
    //------------------------------------------------------------------------------
    // load an object from local storage
    //------------------------------------------------------------------------------
    loadObject<T>(key: string) {
        return new Promise<T>((resolve, reject) => {
            const jsonText = localStorage.getItem(key);
            if(!jsonText) return null;
            try{
                resolve(JSON.parse(jsonText) as T);
            }
            catch(err)
            {
                throw new Error(`Non-JSON data encountered on key ${key} : ${err}`)
            }
    
        });
    };

    //------------------------------------------------------------------------------
    // save an object to local storage
    //------------------------------------------------------------------------------
    saveObject(key: string, saveMe: object) {
        return new Promise<void>((resolve, reject) => {
            localStorage.setItem(key, JSON.stringify(saveMe));
            resolve();   
        });
    };

    //------------------------------------------------------------------------------
    // remove an object 
    //------------------------------------------------------------------------------
    removeObject(key: string) {
        return new Promise<void>((resolve, reject) => {
            localStorage.removeItem(key);
            resolve();   
        });
    };
    
    //------------------------------------------------------------------------------
    // Remove all objects 
    //------------------------------------------------------------------------------
    clear() {
        return new Promise<void>((resolve, reject) => {
            localStorage.clear();
            resolve();   
        });
    };

}

//------------------------------------------------------------------------------
// IndexedDB is way more flexible and can store large amounts of data,
// but it is not supported on all browsers
//------------------------------------------------------------------------------
export class LocalStorageIndexedDB implements ILocalStorage {

    private _dbFactory: IDBFactory;
    private _database: Promise<IDBDatabase>;
    TABLENAME="GeneralKVPairs";
    cachedBytes = 0;

    //------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------
    constructor()
    {
        this._dbFactory = window.indexedDB;

        this._database = new Promise<IDBDatabase>((resolve, reject) =>{
            var request = this._dbFactory.open("CrashCowStorage");
            request.onerror = (event: any) => {
                console.log("IndexDB Fail")
                reject();
            };

            request.onsuccess = (event: any) => {
                resolve(event.target.result);
            };

            request.onupgradeneeded = (event: any) => {
                console.log("IndexDB Upgrade")
                const db = event.target.result;
                const store = db.createObjectStore(this.TABLENAME, {keyPath: "key"})
                store.createIndex("key", "value");
            }
        });
    }

    //------------------------------------------------------------------------------
    // load an object 
    //------------------------------------------------------------------------------
    loadObject<T>(key: string) : Promise<T | null> {
        return new Promise<T>(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME]);
            const objectStore = transaction?.objectStore(this.TABLENAME);
            const request = objectStore?.get(key);
            
            request.onerror = (event) => {
                resolve(null);
            };
            
            request.onsuccess = (event) => {
                const result = request.result as {name: string, value:string}
                if(!result || !result.value || result.value === "") 
                {
                    resolve( null);
                }
                else 
                {
                    try
                    {
                        const returnMe = JSON.parse(result.value) as T;
                        resolve(returnMe);
                    }
                    catch(err)
                    {
                        throw new Error(`Non-JSON data encountered on key ${key} : ${err}`)
                    }                    
                }
            };
        });
    };


    //------------------------------------------------------------------------------
    // load a blob 
    //------------------------------------------------------------------------------
    loadBlob(key: string) : Promise<Blob | null> {
        return new Promise(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME]);
            const objectStore = transaction?.objectStore(this.TABLENAME);
            const request = objectStore?.get(key);
            
            request.onerror = (event) => {
                resolve(null);
            };
            
            request.onsuccess = (event) => {
                const result = request.result as Blob;
                if(!result) 
                {
                    resolve( null);
                }
                else 
                {
                    resolve(result);                  
                }

            };
        });
    };

    //------------------------------------------------------------------------------
    // save an object to local storage
    //------------------------------------------------------------------------------
    saveObject(key: string, saveMe: object): Promise<void> {
        const jsonText = JSON.stringify(saveMe);
        this.cachedBytes += jsonText.length;

        return new Promise<void>(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME], "readwrite");
            const objectStore = transaction.objectStore(this.TABLENAME);
            const index = objectStore.index("key");
            const request = index.get(key);
            const dataRow = {key, value: jsonText};

            request.onsuccess = function (e: any) {
                const request = objectStore.put(dataRow);
                request.onsuccess = request.onerror =  (e: any) => { resolve(); };
            };
            request.onerror = function (e: any) {
                const request = objectStore.add(dataRow)
                request.onsuccess = request.onerror =  (e: any) => { resolve(); };
            }
        });
    }

    //------------------------------------------------------------------------------
    // save a blob to local storage
    //------------------------------------------------------------------------------
    saveBlob(key: string, saveMe: Blob): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME], "readwrite");
            const objectStore = transaction.objectStore(this.TABLENAME);
            const index = objectStore.index("key");
            const request = index.get(key);
            const dataRow = {key, value: saveMe};

            request.onsuccess = function (e: any) {
                const request = objectStore.put(dataRow);
                request.onsuccess = request.onerror =  (e: any) => { resolve(); };
            };
            request.onerror = function (e: any) {
                const request = objectStore.add(dataRow)
                request.onsuccess = request.onerror =  (e: any) => { resolve(); };
            }
        });
    }

    //------------------------------------------------------------------------------
    // Remove an object
    //------------------------------------------------------------------------------
    removeObject(key: string) {
        return new Promise<void>(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME], "readwrite");
            const objectStore = transaction.objectStore(this.TABLENAME);
            const request = objectStore.delete(key);            
            request.onsuccess = request.onerror =  (e: any) => { resolve(); };
        });
    };
    
    //------------------------------------------------------------------------------
    // Remove all objects 
    //------------------------------------------------------------------------------
    clear() {
        return new Promise<void>(async (resolve) => {
            const transaction = (await this._database).transaction([this.TABLENAME], "readwrite");
            const objectStore = transaction.objectStore(this.TABLENAME);
            const request = objectStore.clear();            
            request.onsuccess = request.onerror =  (e: any) => { resolve(); };
        });
    };

}
