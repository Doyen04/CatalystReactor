import { describe, expect, it, vi } from 'vitest'
import { EngineBus } from '@/lib/engine/events/EngineBus'

type TestEvents = {
    ping: { n: number }
    msg: string
}

describe('EngineBus', () => {
    it('delivers the emitted payload to a subscribed listener', () => {
        const bus = new EngineBus<TestEvents>()
        const listener = vi.fn()

        bus.on('ping', listener)
        bus.emit('ping', { n: 7 })

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith({ n: 7 })
    })

    it('delivers to every listener in insertion order', () => {
        const bus = new EngineBus<TestEvents>()
        const order: string[] = []
        bus.on('msg', () => order.push('a'))
        bus.on('msg', () => order.push('b'))
        bus.on('msg', () => order.push('c'))

        bus.emit('msg', 'hello')

        expect(order).toEqual(['a', 'b', 'c'])
    })

    it('emitting a type with no listeners is a no-op', () => {
        const bus = new EngineBus<TestEvents>()

        expect(() => bus.emit('ping', { n: 1 })).not.toThrow()
    })

    it('does not leak listeners across event types', () => {
        const bus = new EngineBus<TestEvents>()
        const listener = vi.fn()

        bus.on('ping', listener)
        bus.emit('msg', 'nope')

        expect(listener).not.toHaveBeenCalled()
    })

    it('the returned unsubscribe function stops delivery', () => {
        const bus = new EngineBus<TestEvents>()
        const listener = vi.fn()

        const off = bus.on('ping', listener)
        bus.emit('ping', { n: 1 })
        off()
        bus.emit('ping', { n: 2 })

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith({ n: 1 })
    })

    it('unsubscribing one listener leaves the others subscribed', () => {
        const bus = new EngineBus<TestEvents>()
        const first = vi.fn()
        const second = vi.fn()

        const off = bus.on('ping', first)
        bus.on('ping', second)
        off()
        bus.emit('ping', { n: 3 })

        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })

    it('unsubscribing twice is safe', () => {
        const bus = new EngineBus<TestEvents>()
        const listener = vi.fn()

        const off = bus.on('ping', listener)
        off()
        expect(() => off()).not.toThrow()

        bus.emit('ping', { n: 1 })
        expect(listener).not.toHaveBeenCalled()
    })

    it('a listener removed during emit still receives the in-flight payload (snapshot)', () => {
        const bus = new EngineBus<TestEvents>()
        const second = vi.fn()
        let offSecond = () => { }
        bus.on('ping', () => offSecond())
        offSecond = bus.on('ping', second)

        bus.emit('ping', { n: 1 })

        expect(second).toHaveBeenCalledTimes(1)
        bus.emit('ping', { n: 2 })
        expect(second).toHaveBeenCalledTimes(1)
    })

    it('a listener added during emit is not called for the in-flight payload', () => {
        const bus = new EngineBus<TestEvents>()
        const late = vi.fn()
        bus.on('ping', () => bus.on('ping', late))

        bus.emit('ping', { n: 1 })

        expect(late).not.toHaveBeenCalled()
        bus.emit('ping', { n: 2 })
        expect(late).toHaveBeenCalledTimes(1)
    })

    it('clear() removes all listeners for all event types', () => {
        const bus = new EngineBus<TestEvents>()
        const ping = vi.fn()
        const msg = vi.fn()

        bus.on('ping', ping)
        bus.on('msg', msg)
        bus.clear()

        bus.emit('ping', { n: 1 })
        bus.emit('msg', 'x')

        expect(ping).not.toHaveBeenCalled()
        expect(msg).not.toHaveBeenCalled()
    })

    it('adding the same listener twice invokes it once per emit (Set semantics)', () => {
        const bus = new EngineBus<TestEvents>()
        const listener = vi.fn()

        bus.on('ping', listener)
        bus.on('ping', listener)
        bus.emit('ping', { n: 1 })

        expect(listener).toHaveBeenCalledTimes(1)
    })
})
