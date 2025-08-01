import rgbToHsv from "./rgbToHsv";

const parseColorToHSV = (color: string): { hsv: HSV, alpha: number } => {
    if (color.startsWith('#')) {
        let hex = color.slice(1).toLowerCase();
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split('').map(ch => ch + ch).join('');
        }
        const hasAlpha = hex.length === 8;
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hasAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        const hsv = rgbToHsv(r, g, b);
        return { hsv, alpha: a };
    }
    return { hsv: { h: 0, s: 100, v: 100 }, alpha: 1 };
}


export default parseColorToHSV