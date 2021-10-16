import { expect } from "chai";
import { ServerConfigType } from "hompag-common";
import { doNothing } from "../helpers/asyncHelper";
import { PageCache } from "../models/PageCache";
import { hompagItemType, IItemStore, ItemReturn } from "../models/ServerModel";
import { MockLogger } from "./testHelpers";


export class MockStore implements IItemStore
{
    calls:string[] = [];
    returnThisItem: ItemReturn | null = null;
    returnThisIdList: string[] = [];

    async getItem(itemType: hompagItemType, id: string, version: number | undefined): Promise<ItemReturn | null> {
        this.calls.push(`getItem(${itemType},${id},${version})`)
        await doNothing(5);
        if(!this.returnThisItem) return null;
        expect(itemType).equals(this.returnThisItem!.type)
        expect(id).equals(this.returnThisItem!.id)
        expect(version ?? this.returnThisItem!.version).equals(this.returnThisItem!.version)
        return this.returnThisItem;
    }
    async getIdList(itemType: hompagItemType): Promise<string[]> {
        this.calls.push(`getIdList(${itemType})`)
        await doNothing(5);
        return this.returnThisIdList;
    }
    async storeItem(itemType: hompagItemType, id: string, version: number, data: string): Promise<void> {
        this.calls.push(`storeItem(${itemType},${id},${version},${data})`)
        await doNothing(5);
    }
    getConfig(configType: ServerConfigType): Promise<string> {
        throw new Error("Method not implemented.");
    }

    

}

const createItems = () => {
    const mockStore = new MockStore();
    const mockLogger = new MockLogger();
    const target= new PageCache(mockStore, mockLogger);

    return {mockStore, mockLogger, target}
}

describe('PageCache.getItem', () => {

    const itemHash = (item: ItemReturn) => `${item.type}.${item.id}.${item.version}.${item.data}`
    
    it('Retrieves known items from memory', async () => {
        const test = createItems();
        await test.target.storeItem(hompagItemType.page,"foo", 12, "ha")
        expect(test.mockStore.calls).deep.equals(["getIdList(page)"])
        test.mockStore.calls = []
        const item = await test.target.getItem(hompagItemType.page, "foo", 12);

        expect(item?.data).equals("ha")
        expect(test.mockStore.calls).deep.equals([])
    });
    
    it('Retrieves unknown items from store', async () => {
        const test = createItems();
        test.mockStore.returnThisItem = {id:"z", type: hompagItemType.page, version:12, data:"bubba"}
        let foundItem = await test.target.getItem(hompagItemType.page, "z", 12);

        expect(test.mockStore.calls).deep.equals(["getIdList(page)", "getItem(page,z,12)"])
        expect("page.z.12.bubba").equals(itemHash(foundItem!))

        // getting again should use the cache
        test.mockStore.calls = []
        foundItem = await test.target.getItem(hompagItemType.page, "z", 12);
        expect(test.mockStore.calls).deep.equals([])
        expect("page.z.12.bubba").equals(itemHash(foundItem!))

        // clearing the cache should force a store call
        test.target.clearItem(hompagItemType.page, "z")
        test.mockStore.returnThisItem = {id:"z", type: hompagItemType.page, version:12, data:"bubba2"}
        foundItem = await test.target.getItem(hompagItemType.page, "z", 12);
        expect(test.mockStore.calls).deep.equals(["getItem(page,z,12)"])
        expect("page.z.12.bubba2").equals(itemHash(foundItem!))

        // clearing an unknown item should be ok 
        test.target.clearItem(hompagItemType.page, "not z")
        test.mockStore.calls = []
        foundItem = await test.target.getItem(hompagItemType.page, "z", 12);
        expect(test.mockStore.calls).deep.equals([])
        expect("page.z.12.bubba2").equals(itemHash(foundItem!))

       
        // should be able to handle items not found in the store
        test.mockStore.returnThisItem = null;
        foundItem = await test.target.getItem(hompagItemType.page, "z", 100);
        expect(test.mockStore.calls).deep.equals(["getItem(page,z,100)"])
        expect(foundItem).null
        foundItem = await test.target.getItem(hompagItemType.page, "z", 100);
        expect(test.mockStore.calls).deep.equals(["getItem(page,z,100)", "getItem(page,z,100)"])
        expect(foundItem).null


    });

    it('Returns latest when version is not specified', async () => {
        const test = createItems();
    
        // Starting from an empty cache, let's retieve a couple of specific items
        test.mockStore.returnThisItem = {id:"x", type: hompagItemType.widget, version:50, data:"a"}
        let foundItem = await test.target.getItem(hompagItemType.widget, "x", 50);
        expect("widget.x.50.a").equals(itemHash(foundItem!))

        test.mockStore.returnThisItem = {id:"x", type: hompagItemType.widget, version:53, data:"b"}
        foundItem = await test.target.getItem(hompagItemType.widget, "x", 53);
        expect("widget.x.53.b").equals(itemHash(foundItem!))

        // At this point, the cache does not know what version is the latest, so an
        // undefined version should sill require a hit on the data store
        test.mockStore.calls = []
        test.mockStore.returnThisItem = {id:"x", type: hompagItemType.widget, version:54, data:"c"}
        foundItem = await test.target.getItem(hompagItemType.widget, "x");
        expect("widget.x.54.c").equals(itemHash(foundItem!))
        expect(1).equals(test.mockStore.calls.length);

        // Because we asked the store for the latest, the cache now knows what version is the latest
        test.mockStore.calls = []
        test.mockStore.returnThisItem = null
        foundItem = await test.target.getItem(hompagItemType.widget, "x");
        expect("widget.x.54.c").equals(itemHash(foundItem!))
        expect(0).equals(test.mockStore.calls.length);

        // Any newly stored item should be the latest item now
        await test.target.storeItem(hompagItemType.widget, "x", 60, "d")
        foundItem = await test.target.getItem(hompagItemType.widget, "x");
        expect("widget.x.60.d").equals(itemHash(foundItem!))
        expect(0).equals(test.mockStore.calls.length);

        // a cache miss should force a call to store
        test.mockStore.calls = []
        test.mockStore.returnThisItem = {id:"x", type: hompagItemType.widget, version:53, data:"c2"}
        foundItem = await test.target.getItem(hompagItemType.widget, "x", 53);
        expect("widget.x.53.c2").equals(itemHash(foundItem!))

        // Now we don't know if the item is the latest, so a versionless call should force a call to the store
        test.mockStore.calls = []
        test.mockStore.returnThisItem = {id:"x", type: hompagItemType.widget, version:60, data:"d2"}
        foundItem = await test.target.getItem(hompagItemType.widget, "x");
        expect("widget.x.60.d2").equals(itemHash(foundItem!))
    });

});

describe('PageCache.ctor', () => {
    it('Retrieves known pages from store', async () => {
        const test = createItems();
        test.mockStore.returnThisIdList = ["inge", "britta", "freja"]
        const items = await test.target.getIdList(hompagItemType.page);

        expect(items).deep.equals(["inge", "britta", "freja"])
        expect(test.mockStore.calls.length).equals(1)
    });
    
   
});

describe('PageCache.flushRecents', () => {
    it('Commits only most recent item updates to the store', async () => {
        const test = createItems();

        test.target.flushRecents(0,1000);
        expect(["getIdList(page)"]).deep.equals(test.mockStore.calls)
        test.mockStore.calls = []

        await test.target.storeItem(hompagItemType.page, "p1", 5, "a");
        await test.target.storeItem(hompagItemType.page, "p1", 6, "b");
        await test.target.storeItem(hompagItemType.page, "p1", 7, "c");
        await test.target.storeItem(hompagItemType.widget, "p1", 8, "d");
        await test.target.storeItem(hompagItemType.widget, "w1", 8, "e");
        await test.target.storeItem(hompagItemType.widget, "w1", 9, "f");

        test.target.flushRecents(0,1000);
        expect([
            "storeItem(page,p1,7,c)",
            "storeItem(widget,p1,8,d)",
            "storeItem(widget,w1,9,f)"]).deep.equals(test.mockStore.calls)

        // Calling again should not do anything
        test.mockStore.calls = []
        test.target.flushRecents(0,1000);
        expect([]).deep.equals(test.mockStore.calls)

    });

    it('Commits only items that have not been touched in a while', async () => {
        const test = createItems();

        test.target.flushRecents(0,0);
        expect(["getIdList(page)"]).deep.equals(test.mockStore.calls)
        test.mockStore.calls = []

        await test.target.storeItem(hompagItemType.page, "p1", 1000, "a");
        await test.target.storeItem(hompagItemType.page, "p3", 1200, "c");
        await test.target.storeItem(hompagItemType.page, "p2", 1100, "b");
        await test.target.storeItem(hompagItemType.page, "p4", 1300, "d");


        test.target.flushRecents(150,1300);
        expect([
            "storeItem(page,p1,1000,a)",
            "storeItem(page,p2,1100,b)"]).deep.equals(test.mockStore.calls)

        // Calling again at a later time should get more
        test.mockStore.calls = []
        test.target.flushRecents(100,1350);
        expect([ "storeItem(page,p3,1200,c)"]).deep.equals(test.mockStore.calls)
        test.mockStore.calls = []
        test.target.flushRecents(100,1550);
        expect([ "storeItem(page,p4,1300,d)"]).deep.equals(test.mockStore.calls)

    });
});

