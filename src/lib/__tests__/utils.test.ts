import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRegistry } from '@lib/core/DependencyManager'
import DependencyManager from '@lib/core/DependencyManager'
import { ResizeCursor } from '@lib/tools/ResizeCursor'
import { isPrintableCharUnicode } from '@util/textUtil'

describe('DependencyManager', () => {
    beforeEach(() => {
        DependencyManager.clear()
        vi.restoreAllMocks()
    })

    it('round-trips a registered fake service through register into resolve', () => {
        const fakePaintManager = { kind: 'paint', draw: () => 'drew' } as unknown as ServiceRegistry['paintManager']

        DependencyManager.register('paintManager', fakePaintManager)

        expect(DependencyManager.resolve('paintManager')).toBe(fakePaintManager)
    })

    it('resolves an unregistered key to null and warns via console.warn', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const result = DependencyManager.resolve('renderer')

        expect(result).toBeNull()
        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('renderer'))
    })

    it('clear() empties the container so a previously registered key resolves to null again', () => {
        DependencyManager.register('shapeManager', {} as unknown as ServiceRegistry['shapeManager'])
        expect(DependencyManager.resolve('shapeManager')).not.toBeNull()

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        DependencyManager.clear()

        expect(DependencyManager.resolve('shapeManager')).toBeNull()
        expect(warnSpy).toHaveBeenCalledTimes(1)
    })
})

describe('ResizeCursor', () => {
    beforeEach(() => {
        ResizeCursor.clearCache()
    })

    it('create returns a base64 SVG data URL', () => {
        const url = ResizeCursor.create(45)

        expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })

    it('create returns the identical string for identical arguments (cache hit)', () => {
        expect(ResizeCursor.create(90)).toBe(ResizeCursor.create(90))
    })

    it('create returns different strings for different size or color', () => {
        const base = ResizeCursor.create(45)
        expect(ResizeCursor.create(45, 32)).not.toBe(base)
        expect(ResizeCursor.create(45, 24, '#123456')).not.toBe(base)
    })

    it('angles that normalize to the same value produce the same data URL', () => {
        expect(ResizeCursor.create(0)).toBe(ResizeCursor.create(360))
        expect(ResizeCursor.create(-90)).toBe(ResizeCursor.create(270))
    })

    it('encodes the requested stroke color into the decoded SVG', () => {
        const url = ResizeCursor.create(45, 24, '#ff0000')

        const svg = Buffer.from(url.split(',')[1], 'base64').toString('utf8')

        expect(svg).toContain('stroke="#ff0000"')
    })

    it('clearCache forces a rebuild that yields the same value', () => {
        const before = ResizeCursor.create(120)

        ResizeCursor.clearCache()

        expect(ResizeCursor.create(120)).toBe(before)
    })

    it('createCursor returns a CSS string with the base64 URL and trailing ", auto" hotspot', () => {
        const css = ResizeCursor.createCursor(45)

        expect(css.startsWith("url('data:image/svg+xml;base64,")).toBe(true)
        expect(css.endsWith(', auto')).toBe(true)
    })

    it('createRotationCursorCSS returns a CSS string with the base64 URL and trailing ", auto" hotspot', () => {
        const css = ResizeCursor.createRotationCursorCSS(0)

        expect(css.startsWith("url('data:image/svg+xml;base64,")).toBe(true)
        expect(css.endsWith(', auto')).toBe(true)
    })
})

describe('isPrintableCharUnicode', () => {
    it('returns true for printable single characters', () => {
        expect(isPrintableCharUnicode('a')).toBe(true)
        expect(isPrintableCharUnicode('9')).toBe(true)
        expect(isPrintableCharUnicode(' ')).toBe(true)
    })

    it('returns false for an empty string', () => {
        expect(isPrintableCharUnicode('')).toBe(false)
    })

    it('returns false for multi-character strings', () => {
        expect(isPrintableCharUnicode('ab')).toBe(false)
    })

    it('returns false for control characters', () => {
        expect(isPrintableCharUnicode('\n')).toBe(false)
        expect(isPrintableCharUnicode('\u0001')).toBe(false)
    })
})