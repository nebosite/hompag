import {
    trim, trimStart, trimEnd, trimChars,
    compareVersionStrings, shortenString,
    formatDateTime, getUTCDateString
} from "./textHelpers";

describe("trim family", () => {
    it("trims whitespace from both ends", () => {
        expect(trim("  \t hi \n ")).toBe("hi");
    });
    it("trimStart only removes from the front", () => {
        expect(trimStart("  hi  ")).toBe("hi  ");
    });
    it("trimEnd only removes from the back", () => {
        expect(trimEnd("  hi  ")).toBe("  hi");
    });
    it("trimChars removes any of the supplied items repeatedly", () => {
        expect(trimChars("xxyhelloyxx", ["x", "y"])).toBe("hello");
    });
    it("returns empty string when everything is trimmed", () => {
        expect(trim("   ")).toBe("");
    });
});

describe("compareVersionStrings", () => {
    it("returns 0 for equal versions", () => {
        expect(compareVersionStrings("1.2.3", "1.2.3")).toBe(0);
    });
    it("treats missing trailing parts as zero", () => {
        expect(compareVersionStrings("1.2", "1.2.0.0")).toBe(0);
    });
    it("compares numerically, not lexically", () => {
        expect(compareVersionStrings("1.10", "1.9")).toBe(1);
        expect(compareVersionStrings("1.9", "1.10")).toBe(-1);
    });
    it("ignores leading/trailing dots", () => {
        expect(compareVersionStrings(".1.2.", "1.2")).toBe(0);
    });
});

describe("shortenString", () => {
    it("falls back to the alternate when text is empty", () => {
        expect(shortenString(20, "", "fallback")).toBe("fallback");
    });
    it("leaves short strings untouched", () => {
        expect(shortenString(20, "short", "alt")).toBe("short");
    });
    it("chops the middle of long strings", () => {
        expect(shortenString(11, "abcdefghijklmnop", "alt")).toBe("abcd...mnop");
    });
});

describe("formatDateTime", () => {
    // Constructed with the local-time constructor so the local-time getters
    // used by formatDateTime are deterministic regardless of the host timezone.
    const date = new Date(2021, 0, 5, 9, 7, 3); // Tue Jan 5 2021 09:07:03 local

    it("formats numeric date/time tokens", () => {
        expect(formatDateTime(date, "yyyy/MM/dd HH:mm:ss")).toBe("2021/01/05 09:07:03");
    });
    it("formats month and weekday names", () => {
        expect(formatDateTime(date, "ddd MMM")).toBe("Tue Jan");
    });
    it("formats 12-hour am/pm", () => {
        expect(formatDateTime(date, "h tt")).toBe("9 am");
    });
});

describe("getUTCDateString", () => {
    it("formats a UTC date (month is 0-indexed, day unpadded by design)", () => {
        const d = new Date(Date.UTC(2021, 0, 5, 9, 7, 3, 12));
        expect(getUTCDateString(d)).toBe("2021/00/5 09:07:03.012");
    });
});
