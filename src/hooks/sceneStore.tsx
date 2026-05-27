import { Properties } from '@lib/types/shapes'
import { create } from 'zustand'
import EngineStateStore from '@lib/core/EngineStateStore'

interface SceneStore {
    selectedShapeId: string | null
    currentShapeProperties: Properties | null
    gridSize: number
    setSelectedShapeId: (id: string | null) => void
    setCurrentShapeProperties: (properties: Properties | null) => void
    updateProperty: (key: string, value: unknown) => void
    clearProperties: () => void
}

export const useSceneStore = create<SceneStore>((set) => ({
    selectedShapeId: null,
    currentShapeProperties: null,
    gridSize: 10,

    setSelectedShapeId: id => {
        set({ selectedShapeId: id })
        if (id) {
            const shapeData = EngineStateStore.getInstance().getShapeData(id)
            if (shapeData) {
                set({ currentShapeProperties: shapeData.properties })
            }
        } else {
            set({ currentShapeProperties: null })
        }
    },

    setCurrentShapeProperties: properties => {
        set({ currentShapeProperties: properties })
    },

    updateProperty: (key, value) =>
        set(state => {
            if (!state.currentShapeProperties) return state

            return {
                currentShapeProperties: {
                    ...state.currentShapeProperties,
                    [key]: value,
                },
            }
        }),

    clearProperties: () => set({ selectedShapeId: null, currentShapeProperties: null }),
}))

// Side effect: listen to EngineStateStore
EngineStateStore.getInstance().subscribe((shapeId) => {
    const state = useSceneStore.getState()
    if (shapeId && shapeId === state.selectedShapeId) {
        const shapeData = EngineStateStore.getInstance().getShapeData(shapeId)
        if (shapeData) {
            state.setCurrentShapeProperties(structuredClone(shapeData.properties))
        }
    } else if (!shapeId) {
        // Full sync if needed
    }
})
