import {
    FillStyle,
    GradientFill,
    ImageFill,
    LinearGradient,
    RadialGradient,
    SolidFill,
} from '@lib/types/shapes'

function arrayBufferToDataUrl(
    buffer: ArrayBuffer,
    mimeType: string = 'image/png'
): string {
    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
}

function getDisplayTextFromFill(fill: FillStyle): string {
    switch (fill.type) {
        case 'solid': {
            const solid = fill as SolidFill
            if (Array.isArray(solid.color)) {
                const [r, g, b] = solid.color.map(v => Math.round(v * 255))
                return `RGB(${r},${g},${b})`
            }
            return solid.color as string
        }
        case 'linear':
            return 'Linear'
        case 'radial':
            return 'Radial'
        case 'image':
            return 'Image'
        case 'pattern':
            return 'Pattern'
        default:
            return 'Unknown'
    }
}

export const colorValue = (value: string | ArrayBuffer | number[]) => {
    return typeof value === 'string' ? value : null
}

export const imageValue = (value: string | ArrayBuffer | number[]) => {
    return value instanceof ArrayBuffer ? value : null
}
export const getGradientAngle = (gradient: LinearGradient) => {
    const dx = gradient.x2 - gradient.x1
    const dy = gradient.y2 - gradient.y1
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360
    return angle
}

export const getGradientPreview = (gradient: GradientFill) => {
    const stops = gradient.stops
        .sort((a, b) => a.offset - b.offset)
        .map(stop => `${stop.color} ${stop.offset * 100}%`)
        .join(', ')

    if (gradient.type === 'linear') {
        const angle = getGradientAngle(gradient)
        return `linear-gradient(${angle}deg, ${stops})`
    } else if (gradient.type === 'radial') {
        return `radial-gradient(circle at ${gradient.cx}% ${gradient.cy}%, ${stops})`
    }

    return 'transparent'
}
export function getBackgroundStyleFromFillValue(
    value: string | ArrayBuffer | number[],
    fill: FillStyle,
    url?: string
) {
    switch (fill.type) {
        case 'solid': {
            const color = colorValue(value)
            return { backgroundColor: color }
        }
        case 'image':
        case 'pattern': {
            if (url) {
                const imageFill = fill as ImageFill
                const scaleMode = imageFill.scaleMode || 'fill'

                switch (scaleMode) {
                    case 'tile':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'auto',
                        }
                    case 'fit':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                        }
                    case 'stretch':
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '100% 100%',
                        }
                    case 'fill':
                    default:
                        return {
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }
                }
            }
            return { backgroundColor: '#808080' }
        }

        case 'linear':
        case 'radial': {
            fill = fill as LinearGradient | RadialGradient
            const back = getGradientPreview(fill)
            return {
                background: back,
            }
        }
        default:
            return { backgroundColor: '#000000' }
    }
}

export function extractFillValue(fill: FillStyle): {
    value: string | ArrayBuffer | number[]
    metadata?: unknown
} {
    switch (fill.type) {
        case 'solid':
            return {
                value: fill.color,
            }

        case 'image':
        case 'pattern':
            fill = fill as ImageFill
            return {
                value: fill.imageData,
            }

        case 'linear':
        case 'radial':
            fill = fill as LinearGradient | RadialGradient
            return {
                value: '',
            }

        default:
            return {
                value: '',
            }
    }
}

export { arrayBufferToDataUrl, getDisplayTextFromFill }
