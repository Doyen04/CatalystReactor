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

const getImageOrColorBackgroundStyle = (urlOrColor: string, fill: Fill): React.CSSProperties => {
    switch (fill.type) {
        case 'solid':
            return { backgroundColor: urlOrColor };

        case 'image':
        case 'pattern': {
            if (urlOrColor) {
                const imageFill = fill as ImageFill;
                const scaleMode = imageFill.scaleMode || 'fill';

                switch (scaleMode) {
                    case 'tile':
                        return {
                            backgroundImage: `url(${urlOrColor})`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'auto'
                        };
                    case 'fit':
                        return {
                            backgroundImage: `url(${urlOrColor})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center'
                        };
                    case 'stretch':
                        return {
                            backgroundImage: `url(${urlOrColor})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '100% 100%'
                        };
                    case 'fill':
                    default:
                        return {
                            backgroundImage: `url(${urlOrColor})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        };
                }
            }
            return { backgroundColor: '#808080' };
        }

    }
}

function getSolidOrImageString(fill: Fill): string {
    switch (fill.type) {
        case 'solid': {
            const solid = fill as SolidFill;
            if (Array.isArray(solid.color)) {
                // Convert RGB array [0-1] to RGB values [0-255]
                const [r, g, b, a = 1] = solid.color;
                const red = Math.round(r * 255);
                const green = Math.round(g * 255);
                const blue = Math.round(b * 255);
                return a < 1 ? `rgba(${red}, ${green}, ${blue}, ${a})` : `rgb(${red}, ${green}, ${blue})`;
            }
            return solid.color as string;
        }
         case 'pattern':
        case 'image': {
            const imageFill = fill as ImageFill
            return arrayBufferToDataUrl(imageFill.imageData)
        }
        default:
            return '#000000';
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
            return 'Linear Gradient';
        case 'radial':
            return 'Radial Gradient';
        case 'image':
            return 'Image';
        case 'pattern':
            return 'Pattern';
        default:
            return 'Unknown';
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

export { getSolidOrImageString, getDisplayTextFromFill, getImageOrColorBackgroundStyle, getGradientBackgroundStyle }
