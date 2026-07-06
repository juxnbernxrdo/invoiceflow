export interface HSL {
    h: number;
    s: number;
    l: number;
}

export function argbToRgb(argb: string): { r: number; g: number; b: number } | null {
    // Standardize to 8 hex chars, removing '#' if present
    let clean = argb.replace('#', '');
    if (clean.length === 6) {
        clean = 'FF' + clean;
    }
    if (clean.length !== 8) {
        return null;
    }
    const r = parseInt(clean.substring(2, 4), 16);
    const g = parseInt(clean.substring(4, 6), 16);
    const b = parseInt(clean.substring(6, 8), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

export type ColorFamily = 'yellow' | 'blue' | 'red' | 'green' | 'purple' | 'none';

export function classifyColor(argb: string): ColorFamily {
    const rgb = argbToRgb(argb);
    if (!rgb) return 'none';
    
    // Ignore near white or near black or very desaturated colors
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    if (hsl.l > 96 || hsl.l < 8 || hsl.s < 8) {
        return 'none';
    }

    const { h } = hsl;
    
    // Yellow family: Hue 40 to 68
    if (h >= 40 && h <= 68) {
        return 'yellow';
    }
    // Green family: Hue 75 to 155
    if (h >= 75 && h <= 155) {
        return 'green';
    }
    // Blue / Cyan family: Hue 170 to 250
    if (h >= 170 && h <= 250) {
        return 'blue';
    }
    // Purple / Magenta family: Hue 260 to 325
    if (h >= 260 && h <= 325) {
        return 'purple';
    }
    // Red family: Hue 0 to 20 or 340 to 360
    if (h <= 20 || h >= 340) {
        return 'red';
    }

    return 'none';
}
