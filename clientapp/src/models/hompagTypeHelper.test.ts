import { hompagTypeHelper, registerType, registerProperty } from "./hompagTypeHelper";

describe("hompagTypeHelper.shouldStringify", () => {
    const helper = new hompagTypeHelper();

    it("excludes ref_/state_ (and underscore-prefixed) properties", () => {
        expect(helper.shouldStringify("Anything", "ref_x", {})).toBe(false);
        expect(helper.shouldStringify("Anything", "state_x", {})).toBe(false);
        expect(helper.shouldStringify("Anything", "_ref_x", {})).toBe(false);
        expect(helper.shouldStringify("Anything", "_state_x", {})).toBe(false);
    });

    it("keeps ordinary properties", () => {
        expect(helper.shouldStringify("Anything", "title", {})).toBe(true);
    });

    it("excludes the volatile version field only on WidgetModel/PageModel", () => {
        expect(helper.shouldStringify("WidgetModel", "version", {})).toBe(false);
        expect(helper.shouldStringify("PageModel", "version", {})).toBe(false);
        expect(helper.shouldStringify("SomethingElse", "version", {})).toBe(true);
    });
});

describe("hompagTypeHelper.constructType", () => {
    const helper = new hompagTypeHelper();

    it("builds a registered type", () => {
        registerType("TestThing", () => ({ __t: "TestThing", value: 0 }));
        const made = helper.constructType("TestThing") as any;
        expect(made.__t).toBe("TestThing");
    });

    it("throws on a missing type name", () => {
        expect(() => helper.constructType("")).toThrow();
    });

    it("throws on an unregistered type name", () => {
        expect(() => helper.constructType("NeverRegistered")).toThrow(/unknown type/i);
    });

    it("maps the legacy WidgetRichTextTTData name onto WidgetRichTextData", () => {
        registerType("WidgetRichTextData", () => ({ __t: "WidgetRichTextData" }));
        const made = helper.constructType("WidgetRichTextTTData") as any;
        expect(made.__t).toBe("WidgetRichTextData");
    });
});

describe("hompagTypeHelper.reconstitute", () => {
    const helper = new hompagTypeHelper();

    it("transforms a property through a registered property handler", () => {
        registerProperty("ReconType", "items", (_t, _n, value) => ({ wrapped: value }));
        expect(helper.reconstitute("ReconType", "items", [1, 2])).toEqual({ wrapped: [1, 2] });
    });

    it("returns the value unchanged when no handler is registered", () => {
        const value = { a: 1 };
        expect(helper.reconstitute("ReconType", "unhandled", value)).toBe(value);
    });
});
