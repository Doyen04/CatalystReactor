import { describe, expect, it } from 'vitest'
import { patchProperty, patchBorderRadius, patchRadiusLock, patchStyle } from '@/lib/bridge/propertyPatch'
import type { ColorProps, Properties } from '@lib/types/shapes'

const base = {
    transform: { x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: { x: 0, y: 0 } },
    size: { width: 100, height: 50 },
    style: {
        fill: { color: '#ff0000', opacity: 1 },
        stroke: { color: '#000000', opacity: 1, width: 2, lineCap: 'round', lineJoin: 'miter', dashArray: [] },
    },
    borderRadius: { 'top-left': 4, 'top-right': 4, 'bottom-left': 4, 'bottom-right': 4, locked: true },
    spikesRatio: { spikes: 5, ratio: 0.5 },
    arcSegment: { startAngle: 0, sweep: 90, ratio: 1 },
    sides: { sides: 3 },
    textStyle: { fontSize: 14 },
} as unknown as Properties

describe('patchProperty', () => {
    it('writes a transform key without mutating the source', () => {
        const result = patchProperty(base, 'x', 25)
        expect(result).toEqual({ transform: { ...base.transform, x: 25 } })
        expect(base.transform.x).toBe(10)
    })

    it('writes rotation/scale transform keys', () => {
        expect(patchProperty(base, 'rotation', 45)?.transform?.rotation).toBe(45)
        expect(patchProperty(base, 'scaleX', 2)?.transform?.scaleX).toBe(2)
        expect(patchProperty(base, 'scaleY', 0.5)?.transform?.scaleY).toBe(0.5)
    })

    it('writes a size key', () => {
        expect(patchProperty(base, 'width', 200)?.size?.width).toBe(200)
        expect(patchProperty(base, 'height', 80)?.size?.height).toBe(80)
    })

    it('writes an anchor point key', () => {
        const result = patchProperty(base, 'anchorPoint_x', 7)
        expect(result?.transform?.anchorPoint?.x).toBe(7)
        expect(result?.transform?.anchorPoint?.y).toBe(0)
    })

    it('writes a stroke key with a dashed path', () => {
        const result = patchProperty(base, 'stroke_width', 3)
        expect(result?.style?.stroke?.width).toBe(3)
    })

    it('writes a stroke dashArray as a numeric array', () => {
        const result = patchProperty(base, 'stroke_dashArray', [2, 3])
        expect(result?.style?.stroke?.dashArray).toEqual([2, 3])
    })

    it('writes a text style key', () => {
        expect(patchProperty(base, 'text_fontSize', 16)?.textStyle?.fontSize).toBe(16)
    })

    it('writes a spikesRatio key', () => {
        expect(patchProperty(base, 'spikes', 7)?.spikesRatio?.spikes).toBe(7)
    })

    it('prefers spikesRatio over arcSegment for a shared key', () => {
        const result = patchProperty(base, 'ratio', 0.9)
        expect(result?.spikesRatio?.ratio).toBe(0.9)
        expect(result?.arcSegment).toBeUndefined()
    })

    it('writes an arcSegment key', () => {
        expect(patchProperty(base, 'sweep', 180)?.arcSegment?.sweep).toBe(180)
    })

    it('writes a sides key', () => {
        expect(patchProperty(base, 'sides', 6)?.sides?.sides).toBe(6)
    })

    it('writes a layout key', () => {
        const result = patchProperty(base, 'layout_gap', 12)
        expect((result?.layoutConstraints as unknown as Record<string, unknown>)?.gap).toBe(12)
    })

    it('writes a nested padding layout key', () => {
        const result = patchProperty(base, 'layout_padding_left', 4)
        expect((result?.layoutConstraints?.padding as Record<string, unknown>)?.left).toBe(4)
    })

    it('returns null for an unknown key', () => {
        expect(patchProperty(base, 'not-a-key', 1)).toBeNull()
    })

    it('does not mutate the source layoutConstraints when absent', () => {
        expect(base.layoutConstraints).toBeUndefined()
    })
})

describe('patchBorderRadius', () => {
    it('sets every corner when locked', () => {
        const result = patchBorderRadius(base.borderRadius, 'top-left', 9)
        expect(result?.borderRadius).toMatchObject({ 'top-left': 9, 'top-right': 9, 'bottom-left': 9, 'bottom-right': 9, locked: true })
    })

    it('applies a radius key like a corner when locked', () => {
        expect(patchBorderRadius(base.borderRadius, 'radii', 6)?.borderRadius?.['top-right']).toBe(6)
    })

    it('sets only the requested corner when unlocked', () => {
        const radiusKeys = { 'top-left': 4, 'top-right': 8, 'bottom-left': 12, 'bottom-right': 16, locked: false } as Properties['borderRadius']
        const result = patchBorderRadius(radiusKeys, 'top-right', 10)
        expect(result?.borderRadius).toMatchObject({ 'top-left': 4, 'top-right': 10, 'bottom-left': 12, 'bottom-right': 16, locked: false })
    })

    it('ignores an invalid corner key when unlocked', () => {
        const radiusKeys = { 'top-left': 4, 'top-right': 8, 'bottom-left': 12, 'bottom-right': 16, locked: false } as Properties['borderRadius']
        expect(patchBorderRadius(radiusKeys, 'radii', 6)?.borderRadius?.['top-right']).toBe(8)
    })
})

describe('patchRadiusLock', () => {
    it('locks all corners to the largest radius', () => {
        const radiusKeys = { 'top-left': 4, 'top-right': 8, 'bottom-left': 12, 'bottom-right': 16, locked: false } as Properties['borderRadius']
        expect(patchRadiusLock(radiusKeys, true)?.borderRadius).toMatchObject({
            'top-left': 16,
            'top-right': 16,
            'bottom-left': 16,
            'bottom-right': 16,
            locked: true,
        })
    })

    it('unlocks while preserving the corners', () => {
        const result = patchRadiusLock(base.borderRadius, false)
        expect(result?.borderRadius?.locked).toBe(false)
        expect(result?.borderRadius?.['top-left']).toBe(4)
    })
})

describe('patchStyle', () => {
    it('replaces the fill', () => {
        const fill = { color: { type: 'solid', color: '#00ff00' }, opacity: 0.5 } as ColorProps
        const result = patchStyle(base.style, 'fill', fill)
        expect(result?.style?.fill).toEqual(fill)
    })

    it('updates the stroke color/opacity and keeps the width', () => {
        const result = patchStyle(base.style, 'strokeColor', { color: { type: 'solid', color: '#ffffff' }, opacity: 0.25 })
        expect(result?.style?.stroke?.color).toEqual({ type: 'solid', color: '#ffffff' })
        expect(result?.style?.stroke?.opacity).toBe(0.25)
        expect(result?.style?.stroke?.width).toBe(2)
    })

    it('returns null when there is no style', () => {
        expect(patchStyle(undefined, 'fill', base.style.fill)).toBeNull()
    })
})
