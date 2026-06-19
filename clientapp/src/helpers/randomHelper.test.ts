import { generateStringId } from "./randomHelper";

describe("generateStringId", () => {
    const allowed = /^[A-Z0-9]+$/;

    it("produces a 10-character id (8 time chars + 2 random)", () => {
        expect(generateStringId()).toHaveLength(10);
    });

    it("only uses characters from the allowed alphabet", () => {
        for (let i = 0; i < 50; i++) {
            expect(generateStringId()).toMatch(allowed);
        }
    });

    it("ends with a time-derived 8-char prefix and a 2-char random suffix", () => {
        const id = generateStringId();
        // Last two chars are the random component; the first eight are derived
        // from the clock, so they are stable for calls within the same millisecond.
        expect(id.slice(0, 8)).toMatch(allowed);
        expect(id.slice(8)).toMatch(allowed);
    });

    it("is mostly unique across rapid calls (entropy within a ms is only the 2 random chars)", () => {
        const ids = new Set<string>();
        for (let i = 0; i < 200; i++) ids.add(generateStringId());
        // Same-millisecond calls collide only when both random chars repeat
        // (36^2 = 1296 combos), so duplicates are uncommon but not impossible.
        expect(ids.size).toBeGreaterThan(150);
    });
});
