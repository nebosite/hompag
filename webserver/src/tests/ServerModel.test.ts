import { expect } from "chai";
import { getItemDescriptor } from "../models/ServerModel";

describe("getItemDescriptor", () => {
    it("splits a forward-slash path into type, id, and version", () => {
        expect(getItemDescriptor("page/myhome/1700000000000.json"))
            .deep.equal({ itemType: "page", id: "myhome", version: "1700000000000" });
    });

    it("normalizes backslash paths (Windows) before splitting", () => {
        expect(getItemDescriptor("widget\\abc123\\456.json"))
            .deep.equal({ itemType: "widget", id: "abc123", version: "456" });
    });

    it("strips the extension to recover the version", () => {
        expect(getItemDescriptor("cache/stock_MSFT/999.json").version).equal("999");
    });

    it("yields an undefined version when there is no filename", () => {
        expect(getItemDescriptor("page/myhome"))
            .deep.equal({ itemType: "page", id: "myhome", version: undefined });
    });
});
