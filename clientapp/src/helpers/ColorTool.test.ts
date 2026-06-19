// ColorTool transitively imports the widget library, which reaches the app
// entry module (src/index.tsx). That entry renders into the DOM at import time,
// so we stub it to expose just the GLOBALS export the widgets need.
jest.mock("index", () => ({ GLOBALS: { Version: "test", Title: "test", renderCount: 0 } }));

import { ColorTool, ColorIndex, ColorValue } from "./ColorTool";

// A simple, fully-specified theme so assertions don't depend on the default set.
const theme = { name: "Test", colors: ["#ADFF0D", "#102030", "#FFFFFF", "#000000", "#808080"] };

describe("ColorTool.color", () => {
    const tool = new ColorTool(theme);

    it("returns the pure theme color at V4_Pure", () => {
        expect(tool.color(ColorIndex.Background, ColorValue.V4_Pure)).toBe("#ADFF0D");
    });

    it("collapses to black at V0_Black", () => {
        expect(tool.color(ColorIndex.Background, ColorValue.V0_Black)).toBe("#000000");
    });

    it("collapses to white at V8_White", () => {
        expect(tool.color(ColorIndex.Background, ColorValue.V8_White)).toBe("#FFFFFF");
    });

    it("defaults to V4_Pure when no value is given", () => {
        expect(tool.color(ColorIndex.Foreground)).toBe("#102030");
    });

    it("always emits an upper-case 7-character hex string", () => {
        const c = tool.color(ColorIndex.Highlight, ColorValue.V5_Lightened);
        expect(c).toMatch(/^#[0-9A-F]{6}$/);
    });
});

describe("ColorTool construction", () => {
    it("pads missing theme colors so all five indices resolve", () => {
        const tool = new ColorTool({ name: "Sparse", colors: ["#112233"] });
        // The unspecified Shadow index falls back to padded black.
        expect(tool.color(ColorIndex.Shadow, ColorValue.V4_Pure)).toBe("#000000");
    });
});
