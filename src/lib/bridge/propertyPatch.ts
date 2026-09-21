import { ColorProps, Properties } from '@lib/types/shapes'

const CORNER_KEYS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const TRANSFORM_KEYS = ['x', 'y', 'rotation', 'scaleX', 'scaleY']
const SIZE_KEYS = ['width', 'height']

export type PropertyEditValue = number | string | number[] | string[] | ColorProps

export function patchProperty(properties: Properties, key: string, value: PropertyEditValue): Partial<Properties> | null {
    const { transform, size, spikesRatio, arcSegment, sides, style, textStyle } = properties

    if (key === 'top-left' || key === 'top-right' || key === 'bottom-left' || key === 'bottom-right' || key === 'radii') {
        return patchBorderRadius(properties.borderRadius, key, value as number)
    }
    if (transform && TRANSFORM_KEYS.includes(key)) {
        return { transform: { ...transform, [key]: value } as unknown as Properties['transform'] }
    }
    if (transform && (key === 'anchorPoint_x' || key === 'anchorPoint_y') && transform.anchorPoint) {
        const anchorKey = key.replace('anchorPoint_', '')
        return {
            transform: {
                ...transform,
                anchorPoint: { ...transform.anchorPoint, [anchorKey]: value } as unknown as Properties['transform']['anchorPoint'],
            } as unknown as Properties['transform'],
        }
    }
    if (size && SIZE_KEYS.includes(key)) {
        return { size: { ...size, [key]: value } as unknown as Properties['size'] }
    }
    if (style && key.startsWith('stroke_')) {
        const strokeKey = key.replace('stroke_', '')
        return { style: { ...style, stroke: { ...style.stroke, [strokeKey]: value } as unknown as Properties['style']['stroke'] } }
    }
    if (textStyle && key.startsWith('text_')) {
        const textKey = key.replace('text_', '')
        return { textStyle: { ...textStyle, [textKey]: value } as unknown as Properties['textStyle'] }
    }
    if (key.startsWith('layout_')) {
        const layoutKey = key.replace('layout_', '')
        const lc = (properties.layoutConstraints ?? {}) as Record<string, unknown>
        if (layoutKey.startsWith('padding_')) {
            const paddingKey = layoutKey.replace('padding_', '')
            const padding = lc.padding && typeof lc.padding === 'object' ? { ...(lc.padding as Record<string, unknown>) } : {}
            return { layoutConstraints: { ...lc, padding: { ...padding, [paddingKey]: value } } as unknown as Properties['layoutConstraints'] }
        }
        return { layoutConstraints: { ...lc, [layoutKey]: value } as unknown as Properties['layoutConstraints'] }
    }
    if (spikesRatio && key in spikesRatio) {
        return { spikesRatio: { ...spikesRatio, [key]: value } as unknown as Properties['spikesRatio'] }
    }
    if (arcSegment && key in arcSegment) {
        return { arcSegment: { ...arcSegment, [key]: value } as unknown as Properties['arcSegment'] }
    }
    if (sides && key in sides) {
        return { sides: { ...sides, [key]: value } as unknown as Properties['sides'] }
    }
    return null
}

export function patchBorderRadius(borderRadius: Properties['borderRadius'], pos: string, value: number): Partial<Properties> | null {
    const br = (borderRadius ?? {}) as Record<string, number | boolean>
    const next: Record<string, number | boolean> = { ...br }
    if (next.locked) {
        for (const corner of CORNER_KEYS) next[corner] = value
    } else if (CORNER_KEYS.includes(pos)) {
        next[pos] = value
    }
    return { borderRadius: next as unknown as Properties['borderRadius'] }
}

export function patchRadiusLock(borderRadius: Properties['borderRadius'], locked: boolean): Partial<Properties> | null {
    const br = (borderRadius ?? {}) as Record<string, number | boolean>
    if (locked) {
        const max = Math.max(
            (br['top-left'] as number) || 0,
            (br['top-right'] as number) || 0,
            (br['bottom-left'] as number) || 0,
            (br['bottom-right'] as number) || 0
        )
        return {
            borderRadius: {
                'top-left': max,
                'top-right': max,
                'bottom-left': max,
                'bottom-right': max,
                locked: true,
            } as unknown as Properties['borderRadius'],
        }
    }
    return { borderRadius: { ...br, locked: false } as unknown as Properties['borderRadius'] }
}

export function patchStyle(style: Properties['style'] | undefined, key: 'fill' | 'strokeColor', value: ColorProps): Partial<Properties> | null {
    if (!style) return null
    if (key === 'fill') return { style: { ...style, fill: value } }
    return { style: { ...style, stroke: { ...style.stroke, color: value.color, opacity: value.opacity } } }
}
