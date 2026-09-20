import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FrameScheduler } from '@/engine/render/FrameScheduler'
import { requestRender, setRenderRequest } from '@/engine/render/renderRequest'

interface PendingFrame {
    id: number
    callback: () => void
}

let pendingFrames: PendingFrame[] = []
let nextFrameId = 0

function fakeRequestFrame(callback: () => void): number {
    const id = nextFrameId++
    pendingFrames.push({ id, callback })
    return id
}

function fakeCancelFrame(id: number): void {
    pendingFrames = pendingFrames.filter((frame) => frame.id !== id)
}

function flushOneFrame(): void {
    const frame = pendingFrames.shift()
    if (frame) frame.callback()
}

function flushAllFrames(): void {
    while (pendingFrames.length > 0) flushOneFrame()
}

describe('FrameScheduler', () => {
    beforeEach(() => {
        pendingFrames = []
        nextFrameId = 0
        vi.stubGlobal('requestAnimationFrame', fakeRequestFrame)
        vi.stubGlobal('cancelAnimationFrame', fakeCancelFrame)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('request() before start() schedules no frame and runs nothing', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.request()

        expect(scheduler.isRunning).toBe(false)
        expect(pendingFrames).toHaveLength(0)
        expect(frame).not.toHaveBeenCalled()
    })

    it('start() sets isRunning and schedules exactly one frame', () => {
        const scheduler = new FrameScheduler(vi.fn())

        scheduler.start()

        expect(scheduler.isRunning).toBe(true)
        expect(pendingFrames).toHaveLength(1)
    })

    it('flushing the scheduled frame runs the callback once', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        flushOneFrame()

        expect(frame).toHaveBeenCalledTimes(1)
    })

    it('coalesces multiple request() calls while a frame is pending into a single run', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        scheduler.request()
        scheduler.request()
        scheduler.request()

        expect(pendingFrames).toHaveLength(1)
        flushAllFrames()
        expect(frame).toHaveBeenCalledTimes(1)
    })

    it('schedules another frame when request() is called after a completed frame', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        flushOneFrame()
        scheduler.request()

        expect(pendingFrames).toHaveLength(1)
        flushOneFrame()
        expect(frame).toHaveBeenCalledTimes(2)
    })

    it('schedules the next frame when request() is called from within the frame callback', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(() => {
            frame()
            scheduler.request()
        })

        scheduler.start()
        flushOneFrame()

        expect(frame).toHaveBeenCalledTimes(1)
        expect(pendingFrames).toHaveLength(1)

        flushOneFrame()

        expect(frame).toHaveBeenCalledTimes(2)
    })

    it('stop() cancels the pending frame and stops running without invoking the callback', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        expect(pendingFrames).toHaveLength(1)

        scheduler.stop()

        expect(scheduler.isRunning).toBe(false)
        expect(pendingFrames).toHaveLength(0)
        flushAllFrames()
        expect(frame).not.toHaveBeenCalled()
    })

    it('request() after stop() schedules nothing', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        scheduler.stop()
        scheduler.request()

        expect(pendingFrames).toHaveLength(0)
        flushAllFrames()
        expect(frame).not.toHaveBeenCalled()
    })

    it('start() after stop() resumes scheduling', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(frame)

        scheduler.start()
        scheduler.stop()
        scheduler.start()

        expect(scheduler.isRunning).toBe(true)
        expect(pendingFrames).toHaveLength(1)
        flushOneFrame()
        expect(frame).toHaveBeenCalledTimes(1)
    })

    it('request() after the frame callback already cleared dirty does not run an extra time', () => {
        const frame = vi.fn()
        const scheduler = new FrameScheduler(() => {
            frame()
            scheduler.request()
        })

        scheduler.start()
        flushOneFrame()
        scheduler.request()

        expect(pendingFrames).toHaveLength(1)
        flushOneFrame()

        expect(frame).toHaveBeenCalledTimes(2)
    })
})

describe('renderRequest', () => {
    afterEach(() => {
        setRenderRequest(null)
    })

    it('setRenderRequest(fn) makes requestRender() invoke fn', () => {
        const render = vi.fn()
        setRenderRequest(render)

        requestRender()

        expect(render).toHaveBeenCalledTimes(1)
    })

    it('setRenderRequest(null) makes requestRender() a safe no-op', () => {
        const render = vi.fn()
        setRenderRequest(render)

        setRenderRequest(null)

        expect(() => requestRender()).not.toThrow()
        expect(render).not.toHaveBeenCalled()
    })

    it('re-setting a request replaces the previous one', () => {
        const first = vi.fn()
        const second = vi.fn()

        setRenderRequest(first)
        setRenderRequest(second)
        requestRender()

        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })
})