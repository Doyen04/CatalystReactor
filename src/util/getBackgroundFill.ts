import { Fill, ImageFill, LinearGradient, RadialGradient, SolidFill } from "@lib/types/shapes";
import React from "react";

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string = 'image/png'): string {
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
}

const getGradientBackgroundStyle = (fill: Fill): React.CSSProperties => {
    switch (fill.type) {
        case 'linear': {
            const gradient = fill as LinearGradient;
            const angle = Math.atan2(gradient.y2 - gradient.y1, gradient.x2 - gradient.x1) * 180 / Math.PI;
            const stops = gradient.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(', ');
            return {
                background: `linear-gradient(${angle}deg, ${stops})`
            };
        }

        case 'radial': {
            const gradient = fill as RadialGradient;
            const stops = gradient.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(', ');
            return {
                background: `radial-gradient(circle, ${stops})`
            };
        }

        default:
            return { backgroundColor: '#000000' };
    }
}

function getDisplayTextFromFill(fill: Fill): string {
    switch (fill.type) {
        case 'solid': {
            const solid = fill as SolidFill;
            if (Array.isArray(solid.color)) {
                const [r, g, b] = solid.color.map(v => Math.round(v * 255));
                return `RGB(${r},${g},${b})`;
            }
            return solid.color as string;
        }
        case 'linear':
            return 'Linear';
        case 'radial':
            return 'Radial';
        case 'image':
            return 'Image';
        case 'pattern':
            return 'Pattern';
        default:
            return 'Unknown';
    }
}

export const colorValue = (value: string | ArrayBuffer | number[]) => {
    return (typeof value === 'string') ? value : null
}

export const imageValue = (value: string | ArrayBuffer | number[]) => {
    return (value instanceof ArrayBuffer) ? value : null
}
export function getBackgroundStyleFromFillValue(value: string | ArrayBuffer | number[], fill: Fill, url?: string) {
    switch (fill.type) {
        case 'solid': {
            const color = colorValue(value)
            return { backgroundColor: color };
        }
        case 'image':
        case 'pattern': {
            if (url) {
                const imageFill = fill as ImageFill;
                const scaleMode = imageFill.scaleMode || 'fill';

                switch (scaleMode) {
                    case 'tile':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'auto'
                        };
                    case 'fit':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center'
                        };
                    case 'stretch':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '100% 100%'
                        };
                    case 'fill':
                    default:
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        };
                }
            }
            return { backgroundColor: '#808080' };
        }

        case 'linear':
        case 'radial':
            fill = fill as LinearGradient | RadialGradient
            return {
                value: '',
            };

    }
}

export function extractFillValue(fill: Fill): {
    value: string | ArrayBuffer | number[];
    metadata?: unknown;
} {
    switch (fill.type) {
        case 'solid':
            return {
                value: fill.color
            };

        case 'image':
        case 'pattern':
            fill = fill as ImageFill
            return {
                value: fill.imageData,
            };

        case 'linear':
        case 'radial':
            fill = fill as LinearGradient | RadialGradient
            return {
                value: '',
            };

        default:
            return {
                value: ''
            };
    }
}

export { arrayBufferToDataUrl, getDisplayTextFromFill, getGradientBackgroundStyle }
