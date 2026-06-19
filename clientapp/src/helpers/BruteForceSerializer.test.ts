import BruteForceSerializer, { ITypeHelper } from "./BruteForceSerializer";

describe("BruteForceSerializer (default type helper)", () => {
    const s = new BruteForceSerializer();
    const roundTrip = (value: any) => s.parse(s.stringify(value));

    it("round-trips primitives", () => {
        expect(roundTrip(42)).toBe(42);
        expect(roundTrip("hello")).toBe("hello");
        expect(roundTrip(true)).toBe(true);
    });

    it("round-trips nested plain objects and arrays", () => {
        const value = { a: 1, b: { c: [1, 2, 3], d: "x" } };
        expect(roundTrip(value)).toEqual(value);
    });

    it("drops undefined properties (normalized to null and omitted)", () => {
        const result: any = roundTrip({ a: 1, b: undefined });
        expect(result.a).toBe(1);
        expect("b" in result).toBe(false);
    });

    it("round-trips Maps", () => {
        const map = new Map<string, number>([["one", 1], ["two", 2]]);
        const result = roundTrip(map) as Map<string, number>;
        expect(result).toBeInstanceOf(Map);
        expect(result.get("one")).toBe(1);
        expect(result.get("two")).toBe(2);
    });

    it("preserves shared references via ~~ tokens", () => {
        const shared = { value: 7 };
        const result: any = roundTrip({ first: shared, second: shared });
        expect(result.first).toEqual({ value: 7 });
        expect(result.first).toBe(result.second);
    });

    it("preserves circular references", () => {
        const node: any = { name: "root" };
        node.self = node;
        const result: any = roundTrip(node);
        expect(result.name).toBe("root");
        expect(result.self).toBe(result);
    });
});

describe("BruteForceSerializer (custom type helper)", () => {
    class Widget {
        __t = "Widget";
        title = "";
        ref_runtime = "should-not-persist";
    }

    const typeHelper: ITypeHelper = {
        constructType: (typeName: string) => {
            if (typeName === "Widget") return new Widget();
            throw new Error(`unknown type ${typeName}`);
        },
        // Exclude ref_-prefixed properties, mirroring the real hompag rule.
        shouldStringify: (_t, propertyName) => !propertyName.startsWith("ref_"),
        reconstitute: (_t, propertyName, value) =>
            propertyName === "title" ? `[${value}]` : value,
    };
    const s = new BruteForceSerializer(typeHelper);

    it("reconstructs typed instances via constructType", () => {
        const w = new Widget();
        w.title = "Hi";
        const result = s.parse<Widget>(s.stringify(w));
        expect(result).toBeInstanceOf(Widget);
    });

    it("honors shouldStringify to exclude properties", () => {
        const w = new Widget();
        w.title = "Hi";
        w.ref_runtime = "secret";
        const json = s.stringify(w);
        expect(json).not.toContain("secret");
        expect(json).not.toContain("ref_runtime");
    });

    it("applies reconstitute when rehydrating properties", () => {
        const w = new Widget();
        w.title = "Hi";
        const result = s.parse<Widget>(s.stringify(w));
        expect(result.title).toBe("[Hi]");
    });

    it("throws when asked to build an unknown type", () => {
        const json = s.stringify({ __t: "Mystery", x: 1 });
        expect(() => s.parse(json)).toThrow(/unknown type Mystery/);
    });
});
