import { registerType } from "models/hompagTypeHelper"
import { colorThemes } from "models/PageModel"

export enum ColorIndex {
    Background = 0,
    Foreground = 1,
    Special = 2,
    Shadow = 3,
    Highlight = 4,
}

export enum ColorValue {
    V0_Black = 0,
    V1_ExtraDark = 1,
    V2_Dark = 2,
    V3_Shaded = 3,
    V4_Pure = 4,
    V5_Lightened = 5,
    V6_Bright = 6,
    V7_ExtraBright = 7,
    V8_White = 8
}

const colorValues = [-1, -.8, -.6, -.3, 0, .3, .6, .8, 1]

registerType("ColorTool", typeHelper => new ColorTool())

export interface ColorTheme {name: string, colors: string[]}

// -------------------------------------------------------------------
// A class for working with a color scheme 
// -------------------------------------------------------------------
export class ColorTool
{
    colorTheme: ColorTheme
    _colors: {r:number, g:number, b:number}[]

    // -------------------------------------------------------------------
    // ctor 
    // -------------------------------------------------------------------
    constructor(colorTheme: ColorTheme = null) {
        if(!colorTheme) colorTheme = colorThemes[0]
        this.colorTheme = colorTheme;
        const colors: string[] = [...colorTheme.colors]
        while(colors.length < 5)
        {
            colors.push("#000000")
        }

        this._colors = []
        colors.forEach(c => {
            const r = parseInt(c.substr(1,2),16);
            const g = parseInt(c.substr(3,2),16);
            const b = parseInt(c.substr(5,2),16);
            this._colors.push({r,g,b})
        })
    }

    // -------------------------------------------------------------------
    // Get a color 
    // -------------------------------------------------------------------
    color = (index: ColorIndex, value: ColorValue = ColorValue.V4_Pure) =>
    {
        let valueFraction = colorValues[value];
        let targetValue = (valueFraction > 0) ? 255: 0;
        valueFraction = Math.abs(valueFraction);
        targetValue *= valueFraction;

        const pureValue = 1 - valueFraction;

        const fix= (v: number) =>
        {
            let vt = Math.floor(v * pureValue + targetValue);
            if(vt < 0) vt = 0;
            if(vt > 255) vt = 255;
            return vt.toString(16).toUpperCase().padStart(2, '0');
        }

        const pureColor = this._colors[index];
        return `#${fix(pureColor.r)}${fix(pureColor.g)}${fix(pureColor.b)}`
    }

}
