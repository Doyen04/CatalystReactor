import { describe, expect, it } from 'vitest'
import type { GradientFill, ImageFill, LinearGradient, PaintStyle } from '@lib/types/shapes'
import { colorValue, extractImageBuffer, getBackgroundStyleFromFillValue, getDisplayTextFromFill, getGradientAngle, getGradientPreview, imageValue } from '@util/getBackgroundFill'

const url = 'https://example.com/img.png'

function linearEndingAt(x2: number, y2: number): LinearGradient {
    return { type: 'linear', x1: 0, y1: 0, x2, y2, stops: [] }
}

function linearOutOfOrder(): LinearGradient {
    return {
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 0,
        stops: [
            { offset: 1, color: '#0000ff' },
            { offset: 0, color: '#ff0000' },
        ],
    }
}

function radialOutOfOrder(): GradientFill {
    return {
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0.5, color: '#00ff00' },
            { offset: 1, color: '#000000' },
            { offset: 0, color: '#ffffff' },
        ],
    }
}

describe('colorValue', () => {
    it('returns a string unchanged', () => {
        expect(colorValue('#ff0000')).toBe('#ff0000')
    })

    it('returns null for an ArrayBuffer', () => {
        expect(colorValue(new ArrayBuffer(4))).toBeNull()
        expect(colorValue(new ArrayBuffer(0))).toBeNull()
    })

    it('returns null for a number[]', () => {
        expect(colorValue([1, 0, 0])).toBeNull()
        expect(colorValue([])).toBeNull()
    })
})

describe('imageValue', () => {
    it('returns an ArrayBuffer as-is', () => {
        const buffer = new ArrayBuffer(8)
        expect(imageValue(buffer)).toBe(buffer)
    })

    it('returns null for a number[]', () => {
        expect(imageValue([1, 2, 3])).toBeNull()
        expect(imageValue([])).toBeNull()
    })
})

describe('getGradientAngle', () => {
    it('horizontal right vector (0,0)->(1,0): atan2(0,1)=0deg + 90 = 90', () => {
        expect(getGradientAngle(linearEndingAt(1, 0))).toBeCloseTo(90, 10)
    })

    it('vertical down vector (0,0)->(0,1): atan2(1,0)=90deg + 90 = 180', () => {
        expect(getGradientAngle(linearEndingAt(0, 1))).toBeCloseTo(180, 10)
    })

    it('vertical up vector (0,0)->(0,-1): atan2(-1,0)=-90deg + 90 = 0 (wrap)', () => {
        expect(getGradientAngle(linearEndingAt(0, -1))).toBeCloseTo(0, 10)
    })

    it('horizontal left vector (0,0)->(-1,0): atan2(0,-1)=180deg + 90 = 270', () => {
        expect(getGradientAngle(linearEndingAt(-1, 0))).toBeCloseTo(270, 10)
    })

    it('down-right diagonal (0,0)->(1,1): atan2(1,1)=45deg + 90 = 135', () => {
        expect(getGradientAngle(linearEndingAt(1, 1))).toBeCloseTo(135, 10)
    })

    it('down-left diagonal (0,0)->(-1,1): atan2(1,-1)=135deg + 90 = 225', () => {
        expect(getGradientAngle(linearEndingAt(-1, 1))).toBeCloseTo(225, 10)
    })

    it('up-left diagonal (0,0)->(-1,-1): atan2(-1,-1)=-135deg + 90 wrapped = 315', () => {
        expect(getGradientAngle(linearEndingAt(-1, -1))).toBeCloseTo(315, 10)
    })

    it('up-right diagonal (0,0)->(1,-1): atan2(-1,1)=-45deg + 90 wrapped = 45', () => {
        expect(getGradientAngle(linearEndingAt(1, -1))).toBeCloseTo(45, 10)
    })
})

describe('getGradientPreview', () => {
    it('formats a linear gradient with stops sorted by offset', () => {
        const gradient = linearOutOfOrder()
        expect(getGradientPreview(gradient)).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
    })

    it('formats a radial gradient as circle at <cx>% <cy>%', () => {
        const gradient = radialOutOfOrder()
        expect(getGradientPreview(gradient)).toBe(
            'radial-gradient(circle at 50% 50%, #ffffff 0%, #00ff00 50%, #000000 100%)'
        )
    })

    it('sorts gradient.stops in place (documented source mutation)', () => {
        const gradient = linearOutOfOrder()
        const stopsRef = gradient.stops
        expect(gradient.stops.map(stop => stop.offset)).toEqual([1, 0])

        getGradientPreview(gradient)

        expect(gradient.stops).toBe(stopsRef)
        expect(gradient.stops.map(stop => stop.offset)).toEqual([0, 1])
    })

    it('falls back to transparent for an unknown gradient type', () => {
        expect(getGradientPreview({ type: 'bogus', stops: [] } as unknown as GradientFill)).toBe('transparent')
    })
})

describe('getDisplayTextFromFill', () => {
    it('formats a numeric solid color as RGB() with 0-255 rounding', () => {
        expect(getDisplayTextFromFill({ type: 'solid', color: [1, 0, 0] })).toBe('RGB(255,0,0)')
    })

    it('rounds fractional numeric colors', () => {
        expect(getDisplayTextFromFill({ type: 'solid', color: [0.5, 0.25, 1] })).toBe('RGB(128,64,255)')
    })

    it('returns a string solid color as-is', () => {
        expect(getDisplayTextFromFill({ type: 'solid', color: '#123456' })).toBe('#123456')
    })

    it('returns the gradient/image/pattern labels', () => {
        expect(getDisplayTextFromFill({ type: 'linear' } as PaintStyle)).toBe('Linear')
        expect(getDisplayTextFromFill({ type: 'radial' } as PaintStyle)).toBe('Radial')
        expect(getDisplayTextFromFill({ type: 'image' } as PaintStyle)).toBe('Image')
        expect(getDisplayTextFromFill({ type: 'pattern' } as PaintStyle)).toBe('Pattern')
    })

    it('returns Unknown for an unknown fill type', () => {
        expect(getDisplayTextFromFill({ type: 'bogus' } as unknown as PaintStyle)).toBe('Unknown')
    })
})

describe('getBackgroundStyleFromFillValue', () => {
    it('maps a solid string color to backgroundColor', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'solid', color: '#abcdef' })).toEqual({ backgroundColor: '#abcdef' })
    })

    it('maps a solid numeric color to backgroundColor: null (documented source bug)', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'solid', color: [1, 0, 0] })).toEqual({ backgroundColor: null })
    })

    it('falls back to #808080 for image/pattern without a url', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image', scaleMode: 'fill' })).toEqual({ backgroundColor: '#808080' })
        expect(getBackgroundStyleFromFillValue({ type: 'pattern', repeat: 'repeat' })).toEqual({ backgroundColor: '#808080' })
    })

    it('maps an image url with scaleMode tile', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image', scaleMode: 'tile' }, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
        })
    })

    it('maps an image url with scaleMode fit', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image', scaleMode: 'fit' }, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
        })
    })

    it('maps an image url with scaleMode stretch', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image', scaleMode: 'stretch' }, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
        })
    })

    it('maps an image url with scaleMode fill', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image', scaleMode: 'fill' }, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        })
    })

    it('defaults an image url without scaleMode to cover (fill)', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'image' } as ImageFill, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        })
    })

    it('maps a pattern url through the scaleMode branch, ignoring repeat (documented source bug)', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'pattern', repeat: 'repeat' }, url)).toEqual({
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        })
    })

    it('maps a linear fill to a background gradient preview', () => {
        const gradient = linearOutOfOrder()
        expect(getBackgroundStyleFromFillValue(gradient)).toEqual({ background: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)' })
    })

    it('maps a radial fill to a background gradient preview', () => {
        expect(getBackgroundStyleFromFillValue(radialOutOfOrder())).toEqual({
            background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #00ff00 50%, #000000 100%)',
        })
    })

    it('defaults an unknown fill type to #000000', () => {
        expect(getBackgroundStyleFromFillValue({ type: 'bogus' } as unknown as PaintStyle)).toEqual({ backgroundColor: '#000000' })
    })
})

describe('extractImageBuffer', () => {
    it('returns the imageBuffer of an image fill', () => {
        const buffer = new ArrayBuffer(8)
        const result = extractImageBuffer({ type: 'image', scaleMode: 'fill', imageData: { imageBuffer: buffer, name: 'img.png' } })
        expect(result).toEqual({ buf: buffer })
        expect(result.buf).toBe(buffer)
    })

    it('returns the imageBuffer of a pattern fill', () => {
        const buffer = new ArrayBuffer(8)
        expect(extractImageBuffer({ type: 'pattern', repeat: 'repeat', imageData: { imageBuffer: buffer, name: 'p.png' } }).buf).toBe(buffer)
    })

    it('returns an empty buf for an image fill without imageData', () => {
        expect(extractImageBuffer({ type: 'image', scaleMode: 'fill' })).toEqual({ buf: [] })
    })

    it('returns an empty buf for non-image/pattern fills', () => {
        expect(extractImageBuffer({ type: 'solid', color: '#ffffff' })).toEqual({ buf: [] })
        expect(extractImageBuffer({ type: 'linear' } as PaintStyle)).toEqual({ buf: [] })
    })
})