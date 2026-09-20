import type { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import { useSceneStore } from '@hooks/sceneStore'
import { useToolStore } from '@hooks/useTool'

export function connectEngineToStores(bus: EngineBus<EngineEvents>): () => void {
    const offTool = bus.on('tool:changed', ({ tool }) => {
        const store = useToolStore.getState()
        if (tool === store.defaultTool?.toolName) {
            store.setDefaultTool()
        }
    })

    const offSelection = bus.on('selection:changed', ({ id }) => {
        useSceneStore.getState().setSelectedShapeId(id)
    })

    return () => {
        offTool()
        offSelection()
    }
}
