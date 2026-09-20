import { describe, expect, it, vi } from 'vitest'
import { PCache } from '@lib/core/Cache'

interface DeletableStub {
    delete: ReturnType<typeof vi.fn<() => void>>
}

function stub(deleteImpl?: () => void): DeletableStub {
    return { delete: vi.fn<() => void>(deleteImpl) }
}

function silenceWarn() {
    return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

describe('PCache.get', () => {
    it('returns null for a missing key', () => {
        const cache = new PCache()
        expect(cache.get('missing')).toBeNull()
    })

    it('returns the exact value stored by set', () => {
        const cache = new PCache()
        const value = stub()
        cache.set('key', value)
        expect(cache.get('key')).toBe(value)
    })
})

describe('PCache.has', () => {
    it('reports absence before set and presence after set', () => {
        const cache = new PCache()
        expect(cache.has('key')).toBe(false)
        cache.set('key', stub())
        expect(cache.has('key')).toBe(true)
    })
})

describe('PCache.set', () => {
    it('evicts the least-recently-used key at capacity and calls its delete once', () => {
        const cache = new PCache(3)
        const a = stub()
        const b = stub()
        const c = stub()
        const d = stub()
        cache.set('a', a)
        cache.set('b', b)
        cache.set('c', c)
        cache.set('d', d)

        expect(a.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('a')).toBe(false)
        expect(cache.has('b')).toBe(true)
        expect(cache.has('c')).toBe(true)
        expect(cache.has('d')).toBe(true)
        expect(b.delete).not.toHaveBeenCalled()
        expect(c.delete).not.toHaveBeenCalled()
        expect(d.delete).not.toHaveBeenCalled()
    })

    it('marks a key accessed by get as recently used, so overflow evicts a different key', () => {
        const cache = new PCache(3)
        const a = stub()
        const b = stub()
        const c = stub()
        const d = stub()
        cache.set('a', a)
        cache.set('b', b)
        cache.set('c', c)
        cache.get('a')
        cache.set('d', d)

        expect(b.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('b')).toBe(false)
        expect(cache.has('a')).toBe(true)
        expect(cache.has('c')).toBe(true)
        expect(cache.has('d')).toBe(true)
        expect(a.delete).not.toHaveBeenCalled()
    })

    it('replacing an existing key calls the old value delete exactly once and stores the new one', () => {
        const cache = new PCache()
        const oldValue = stub()
        const newValue = stub()
        cache.set('key', oldValue)
        cache.set('key', newValue)

        expect(oldValue.delete).toHaveBeenCalledTimes(1)
        expect(newValue.delete).not.toHaveBeenCalled()
        expect(cache.get('key')).toBe(newValue)
    })

    it('replacing a key at capacity does not evict anything else', () => {
        const cache = new PCache(1)
        const a = stub()
        const b = stub()
        cache.set('a', a)
        cache.set('a', b)

        expect(a.delete).toHaveBeenCalledTimes(1)
        expect(b.delete).not.toHaveBeenCalled()
        expect(cache.has('a')).toBe(true)
        expect(cache.get('a')).toBe(b)
    })

    it('still updates the cache when the replaced value delete throws', () => {
        const warn = silenceWarn()
        const cache = new PCache()
        const oldValue = stub(() => {
            throw new Error('boom')
        })
        const newValue = stub()
        cache.set('key', oldValue)

        expect(() => cache.set('key', newValue)).not.toThrow()
        expect(oldValue.delete).toHaveBeenCalledTimes(1)
        expect(cache.get('key')).toBe(newValue)
        expect(warn).toHaveBeenCalled()
    })
})

describe('PCache.delete', () => {
    it('calls delete on the stored value and returns true', () => {
        const cache = new PCache()
        const value = stub()
        cache.set('key', value)

        expect(cache.delete('key')).toBe(true)
        expect(value.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('key')).toBe(false)
        expect(cache.get('key')).toBeNull()
    })

    it('returns false and calls nothing for a missing key', () => {
        const cache = new PCache()
        expect(cache.delete('missing')).toBe(false)
    })

    it('returns true and removes the entry when the value delete throws', () => {
        const warn = silenceWarn()
        const cache = new PCache()
        const value = stub(() => {
            throw new Error('boom')
        })
        cache.set('key', value)

        let result: boolean | undefined
        expect(() => {
            result = cache.delete('key')
        }).not.toThrow()
        expect(result).toBe(true)
        expect(value.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('key')).toBe(false)
        expect(warn).toHaveBeenCalled()
    })
})

describe('PCache.clear', () => {
    it('calls delete on every stored value and empties the cache', () => {
        const cache = new PCache()
        const a = stub()
        const b = stub()
        const c = stub()
        cache.set('a', a)
        cache.set('b', b)
        cache.set('c', c)

        cache.clear()

        expect(a.delete).toHaveBeenCalledTimes(1)
        expect(b.delete).toHaveBeenCalledTimes(1)
        expect(c.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('a')).toBe(false)
        expect(cache.has('b')).toBe(false)
        expect(cache.has('c')).toBe(false)
        expect(cache.get('a')).toBeNull()
    })

    it('still empties the cache when a stored value delete throws', () => {
        const warn = silenceWarn()
        const cache = new PCache()
        const good = stub()
        const bad = stub(() => {
            throw new Error('boom')
        })
        cache.set('good', good)
        cache.set('bad', bad)

        expect(() => cache.clear()).not.toThrow()
        expect(good.delete).toHaveBeenCalledTimes(1)
        expect(bad.delete).toHaveBeenCalledTimes(1)
        expect(cache.has('good')).toBe(false)
        expect(cache.has('bad')).toBe(false)
        expect(warn).toHaveBeenCalled()
    })
})