import { beforeEach, describe, expect, it } from 'vitest'
import { EngineBus } from '@/lib/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import { connectEngineToStores } from '@/lib/bridge/engineStoreBridge'
import { useToolStore } from '@hooks/useTool'
import { useSceneStore } from '@hooks/sceneStore'

function makeBus() {
    return new EngineBus<EngineEvents>()
}

beforeEach(() => {
    useToolStore.setState({ tool: null, defaultTool: { toolName: 'select', icon: null, tip: '' } })
    useSceneStore.setState({ selectedShapeId: null })
})

describe('connectEngineToStores', () => {
    it('maps selection:changed to the scene store selectedShapeId', () => {
        const bus = makeBus()
        connectEngineToStores(bus)

        useSceneStore.setState({ selectedShapeId: 'shape-1' })
        bus.emit('selection:changed', { id: null })

        expect(useSceneStore.getState().selectedShapeId).toBeNull()
    })

    it('maps a non-null selection:changed id to the scene store', () => {
        const bus = makeBus()
        connectEngineToStores(bus)

        bus.emit('selection:changed', { id: 'shape-42' })

        expect(useSceneStore.getState().selectedShapeId).toBe('shape-42')
    })

    it('tool:changed matching the default tool returns the tool store to its default', () => {
        const bus = makeBus()
        connectEngineToStores(bus)
        useToolStore.setState({ tool: { toolName: 'rect', icon: null, tip: '' } })

        bus.emit('tool:changed', { tool: 'select' })

        expect(useToolStore.getState().tool?.toolName).toBe('select')
    })

    it('tool:changed for a non-default tool leaves the active tool untouched', () => {
        const bus = makeBus()
        connectEngineToStores(bus)
        const active = { toolName: 'rect', icon: null, tip: '' }
        useToolStore.setState({ tool: active })

        bus.emit('tool:changed', { tool: 'line' })

        expect(useToolStore.getState().tool).toBe(active)
    })

    it('returns a disconnect that detaches every subscription', () => {
        const bus = makeBus()
        const disconnect = connectEngineToStores(bus)
        disconnect()

        bus.emit('selection:changed', { id: 'shape-9' })
        useToolStore.setState({ tool: { toolName: 'rect', icon: null, tip: '' } })
        bus.emit('tool:changed', { tool: 'select' })

        expect(useSceneStore.getState().selectedShapeId).toBeNull()
        expect(useToolStore.getState().tool?.toolName).toBe('rect')
    })

    it('supports multiple independent connections with their own teardown', () => {
        const first = makeBus()
        const second = makeBus()
        const offFirst = connectEngineToStores(first)
        connectEngineToStores(second)

        offFirst()
        first.emit('selection:changed', { id: 'from-first' })
        expect(useSceneStore.getState().selectedShapeId).toBeNull()

        second.emit('selection:changed', { id: 'from-second' })
        expect(useSceneStore.getState().selectedShapeId).toBe('from-second')
    })
})
