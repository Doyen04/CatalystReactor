import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { CanvasKit, Paragraph } from 'canvaskit-wasm'
import { PaintCache, type PaintRequest } from '@/lib/engine/render/PaintCache'
import { ResourceScope } from '@/lib/engine/render/ResourceScope'
import { registerResourceCounter, startResourceCounterMonitor, unregisterResourceCounter } from '@/lib/engine/render/ResourceCounter'
import { TextCache } from '@/lib/engine/render/TextCache'

function makeFakePaint() {
    return {
        setAntiAlias: vi.fn(),
        setStyle: vi.fn(),
        setStrokeWidth: vi.fn(),
        setColor: vi.fn(),
        setShader: vi.fn(),
        setAlphaf: vi.fn(),
        delete: vi.fn(),
    }
}

type FakePaint = ReturnType<typeof makeFakePaint>

function makeShader() {
    return { delete: vi.fn() }
}

function makeParagraphBuild() {
    return vi.fn(() => ({ delete: vi.fn() }) as unknown as Paragraph)
}

function makeFakeCanvasKit() {
    return {
        Paint: makeFakePaint,
        PaintStyle: { Fill: 0, Stroke: 1 },
        parseColorString: vi.fn(() => new Float32Array([0, 0, 0, 1])),
        Shader: { MakeLinearGradient: vi.fn(() => makeShader()) },
        TileMode: { Clamp: 0 },
    }
}

function rawPaint(paint: unknown): FakePaint {
    return paint as unknown as FakePaint
}

function solid(color: string | number[]): PaintRequest {
    return { color: { type: 'solid', color }, opacity: 1, size: { width: 100, height: 100 } }
}

describe('ResourceScope', () => {
    it('tracks a resource and reports its size', () => {
        const scope = new ResourceScope()
        const resource = { delete: vi.fn() }
        expect(scope.track(resource)).toBe(resource)
        expect(scope.size).toBe(1)
        scope.track({ delete: vi.fn() })
        expect(scope.size).toBe(2)
        expect(scope.disposed).toBe(false)
    })

    it('deletes every tracked resource exactly once on dispose', () => {
        const scope = new ResourceScope()
        const first = { delete: vi.fn() }
        const second = { delete: vi.fn() }
        scope.track(first)
        scope.track(second)
        scope.dispose()
        expect(first.delete).toHaveBeenCalledTimes(1)
        expect(second.delete).toHaveBeenCalledTimes(1)
        expect(scope.size).toBe(0)
    })

    it('disposes in reverse tracking order', () => {
        const scope = new ResourceScope()
        const order: string[] = []
        scope.track({ delete: () => order.push('first') })
        scope.track({ delete: () => order.push('second') })
        scope.track({ delete: () => order.push('third') })
        scope.dispose()
        expect(order).toEqual(['third', 'second', 'first'])
    })

    it('is idempotent — a second dispose does not delete again', () => {
        const scope = new ResourceScope()
        const resource = { delete: vi.fn() }
        scope.track(resource)
        scope.dispose()
        scope.dispose()
        expect(resource.delete).toHaveBeenCalledTimes(1)
        expect(scope.disposed).toBe(true)
    })

    it('throws when tracking after dispose', () => {
        const scope = new ResourceScope()
        scope.dispose()
        expect(() => scope.track({ delete: vi.fn() })).toThrow('ResourceScope is already disposed')
    })

    it('keeps disposing the remaining resources when one delete throws', () => {
        const scope = new ResourceScope()
        const throwing = {
            delete: () => {
                throw new Error('boom')
            },
        }
        const fine = { delete: vi.fn() }
        scope.track(throwing)
        scope.track(fine)
        expect(() => scope.dispose()).not.toThrow()
        expect(fine.delete).toHaveBeenCalledTimes(1)
    })
})

describe('TextCache', () => {
    it('returns the cached paragraph for the same id, version and width', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const first = cache.getParagraph('text', 1, 100, build)
        const second = cache.getParagraph('text', 1, 100, build)
        expect(second).toBe(first)
        expect(build).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(1)
    })

    it('rebuilds and deletes the stale paragraph when the version changes', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const old = cache.getParagraph('text', 1, 100, build)
        const newer = cache.getParagraph('text', 2, 100, build)
        expect(newer).not.toBe(old)
        expect(build).toHaveBeenCalledTimes(2)
        expect(old.delete).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(1)
    })

    it('rebuilds and deletes the stale paragraph when the width changes', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const old = cache.getParagraph('text', 1, 100, build)
        const wider = cache.getParagraph('text', 1, 200, build)
        expect(wider).not.toBe(old)
        expect(build).toHaveBeenCalledTimes(2)
        expect(old.delete).toHaveBeenCalledTimes(1)
    })

    it('invalidate deletes the paragraph once and forces a rebuild on the next get', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const first = cache.getParagraph('text', 1, 100, build)
        cache.invalidate('text')
        expect(first.delete).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(1)
        const rebuilt = cache.getParagraph('text', 1, 100, build)
        expect(rebuilt).not.toBe(first)
        expect(build).toHaveBeenCalledTimes(2)
        expect(first.delete).toHaveBeenCalledTimes(1)
    })

    it('delete removes the entry and deletes the paragraph exactly once', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const first = cache.getParagraph('text', 1, 100, build)
        cache.delete('text')
        expect(first.delete).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(0)
        cache.delete('text')
        expect(first.delete).toHaveBeenCalledTimes(1)
    })

    it('dispose deletes every cached paragraph once and clears the cache', () => {
        const cache = new TextCache()
        const build = makeParagraphBuild()
        const a = cache.getParagraph('a', 1, 100, build)
        const b = cache.getParagraph('b', 1, 100, build)
        cache.dispose()
        expect(a.delete).toHaveBeenCalledTimes(1)
        expect(b.delete).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(0)
        cache.dispose()
        expect(a.delete).toHaveBeenCalledTimes(1)
    })
})

describe('ResourceCounter', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
        unregisterResourceCounter('counter-a')
        unregisterResourceCounter('counter-b')
    })

    it('logs the registered sizes on each monitor interval', () => {
        vi.useFakeTimers()
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
        const source = { size: 3 }
        registerResourceCounter('counter-a', source)
        const stop = startResourceCounterMonitor(10)
        vi.advanceTimersByTime(10)
        expect(debug).toHaveBeenNthCalledWith(1, '[skia]', { 'counter-a': 3 })
        source.size = 7
        vi.advanceTimersByTime(10)
        expect(debug).toHaveBeenNthCalledWith(2, '[skia]', { 'counter-a': 7 })
        stop()
    })

    it('excludes unregistered sources from the snapshot', () => {
        vi.useFakeTimers()
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
        registerResourceCounter('counter-a', { size: 1 })
        registerResourceCounter('counter-b', { size: 2 })
        const stop = startResourceCounterMonitor(10)
        vi.advanceTimersByTime(10)
        expect(debug).toHaveBeenNthCalledWith(1, '[skia]', { 'counter-a': 1, 'counter-b': 2 })
        unregisterResourceCounter('counter-a')
        vi.advanceTimersByTime(10)
        expect(debug).toHaveBeenNthCalledWith(2, '[skia]', { 'counter-b': 2 })
        stop()
    })

    it('stop() halts the interval', () => {
        vi.useFakeTimers()
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
        registerResourceCounter('counter-a', { size: 1 })
        const stop = startResourceCounterMonitor(10)
        vi.advanceTimersByTime(10)
        expect(debug).toHaveBeenCalledTimes(1)
        stop()
        vi.advanceTimersByTime(100)
        expect(debug).toHaveBeenCalledTimes(1)
    })
})

describe('PaintCache', () => {
    function makeCache() {
        const ck = makeFakeCanvasKit()
        const cache = new PaintCache(ck as unknown as CanvasKit)
        return { ck, cache }
    }

    it('returns the identical cached paint for equal requests', () => {
        const { cache } = makeCache()
        expect(cache.get(solid('#ff0000'))).toBe(cache.get(solid('#ff0000')))
    })

    it('keys on request content, not object identity, and builds only once', () => {
        const { ck, cache } = makeCache()
        const a = solid('#ff0000')
        const b = solid('#ff0000')
        cache.get(a)
        cache.get(b)
        expect(ck.parseColorString).toHaveBeenCalledTimes(1)
        expect(cache.size).toBe(1)
    })

    it('configures a stroke paint with style, width and alpha', () => {
        const { ck, cache } = makeCache()
        const paint = rawPaint(
            cache.get({ color: { type: 'solid', color: '#ff0000' }, opacity: 0.5, size: { width: 100, height: 100 }, stroke: true, strokeWidth: 4 })
        )
        expect(paint.setStyle).toHaveBeenCalledWith(ck.PaintStyle.Stroke)
        expect(paint.setStrokeWidth).toHaveBeenCalledWith(4)
        expect(paint.setAlphaf).toHaveBeenCalledWith(0.5)
        expect(paint.setShader).not.toHaveBeenCalled()
    })

    it('sets an array color as a Float32Array on the private paint', () => {
        const { ck, cache } = makeCache()
        const paint = rawPaint(cache.get(solid([1, 2, 3, 1])))
        expect(paint.setColor).toHaveBeenCalledTimes(1)
        expect(paint.setColor.mock.calls[0][0]).toBeInstanceOf(Float32Array)
        expect(paint.setColor.mock.calls[0][0]).toEqual(new Float32Array([1, 2, 3, 1]))
        expect(paint.setShader).not.toHaveBeenCalled()
        expect(ck.parseColorString).not.toHaveBeenCalled()
    })

    it('scales gradient coordinates to pixels and deletes the shader on dispose', () => {
        const { ck, cache } = makeCache()
        const request: PaintRequest = {
            color: {
                type: 'linear',
                x1: 0,
                y1: 0,
                x2: 100,
                y2: 100,
                stops: [
                    { offset: 0, color: '#fff' },
                    { offset: 1, color: '#000' },
                ],
            },
            opacity: 1,
            size: { width: 50, height: 100 },
        }
        const paint = rawPaint(cache.get(request))
        const make = ck.Shader.MakeLinearGradient as unknown as Mock<(...args: unknown[]) => unknown>
        expect(make).toHaveBeenCalledTimes(1)
        expect(make.mock.calls[0][0]).toEqual([0, 0])
        expect(make.mock.calls[0][1]).toEqual([50, 100])
        expect(make.mock.calls[0][2]).toHaveLength(2)
        expect(make.mock.calls[0][3]).toEqual([0, 1])
        expect(make.mock.calls[0][4]).toBe(ck.TileMode.Clamp)
        expect(paint.setShader).toHaveBeenCalledTimes(1)
        const shader = make.mock.results[0].value as { delete: ReturnType<typeof vi.fn> }
        cache.dispose()
        expect(shader.delete).toHaveBeenCalledTimes(1)
        expect(paint.delete).toHaveBeenCalledTimes(1)
    })

    it('falls back to an opaque black paint when an image fill cannot be resolved', () => {
        const { ck, cache } = makeCache()
        const paint = rawPaint(cache.get({ color: { type: 'image', scaleMode: 'fill' }, opacity: 1, size: { width: 10, height: 10 } }))
        expect(ck.parseColorString).toHaveBeenCalledWith('#000')
        expect(paint.setColor).toHaveBeenCalledTimes(1)
        expect(paint.setShader).not.toHaveBeenCalled()
    })

    it('evicts the least-recently-used paint at capacity and deletes it once', () => {
        const { cache } = makeCache()
        const created: FakePaint[] = []
        const requests: PaintRequest[] = []
        for (let i = 0; i < 200; i++) {
            const req = solid([i, 0, 0, 1])
            requests.push(req)
            created.push(rawPaint(cache.get(req)))
        }
        expect(cache.size).toBe(200)
        expect(rawPaint(cache.get(requests[0]))).toBe(created[0])
        cache.get(solid([999, 0, 0, 1]))
        expect(cache.size).toBe(200)
        expect(created[1].delete).toHaveBeenCalledTimes(1)
        expect(created[0].delete).not.toHaveBeenCalled()
        expect(rawPaint(cache.get(requests[2]))).toBe(created[2])
        cache.dispose()
        expect(created[0].delete).toHaveBeenCalledTimes(1)
    })

    it('dispose deletes every cached paint exactly once and clears the cache', () => {
        const { cache } = makeCache()
        const paints = [rawPaint(cache.get(solid('#ff0000'))), rawPaint(cache.get(solid('#00ff00'))), rawPaint(cache.get(solid('#0000ff')))]
        cache.dispose()
        for (const paint of paints) {
            expect(paint.delete).toHaveBeenCalledTimes(1)
        }
        expect(cache.size).toBe(0)
    })

    it('keeps deleting the remaining entries when one delete throws', () => {
        const { cache } = makeCache()
        const failing = rawPaint(cache.get(solid('#ff0000')))
        const fine = rawPaint(cache.get(solid('#00ff00')))
        failing.delete.mockImplementation(() => {
            throw new Error('boom')
        })
        expect(() => cache.dispose()).not.toThrow()
        expect(fine.delete).toHaveBeenCalledTimes(1)
    })
})
