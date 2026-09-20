import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import debounce from '@lib/helper/debounce'
import throttle from '@lib/helper/throttle'

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('fires once with the last args for rapid calls before the delay', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('a')
        debounced('b')
        debounced('c')

        vi.advanceTimersByTime(99)
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenLastCalledWith('c')
    })

    it('fires the callback once when advancing exactly the delay', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('x')
        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('x')
    })

    it('starts a new timer after a call is delivered, firing again', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('first')
        vi.advanceTimersByTime(100)

        debounced('second')
        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, 'first')
        expect(fn).toHaveBeenNthCalledWith(2, 'second')
    })

    it('defaults the delay to 200ms', () => {
        const fn = vi.fn()
        const debounced = debounce(fn)

        debounced('z')
        vi.advanceTimersByTime(199)
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('z')
    })
})

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(1000000)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('fires immediately on the first call', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled('a')
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('a')
    })

    it('drops a second call within the limit', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled('a')
        throttled('b')
        vi.advanceTimersByTime(50)
        throttled('c')

        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('fires a call after the limit has elapsed with its args', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled('a')
        vi.advanceTimersByTime(100)
        throttled('b')

        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, 'a')
        expect(fn).toHaveBeenNthCalledWith(2, 'b')
    })

    it('defaults the limit to 100ms', () => {
        const fn = vi.fn()
        const throttled = throttle(fn)

        throttled('a')
        throttled('b')
        vi.advanceTimersByTime(99)
        throttled('c')
        expect(fn).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(1)
        throttled('d')
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(2, 'd')
    })
})