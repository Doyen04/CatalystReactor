import { Properties } from '@lib/types/shapes'
import { create } from 'zustand'

interface SceneStore {
    currentShapeProperties: Properties | null
    setCurrentShapeProperties: (properties: Properties | null) => void
    updateProperty: (key: string, value: any) => void
    clearProperties: () => void
}

export const useSceneStore = create<SceneStore>(set => ({
    currentShapeProperties: null,

    setCurrentShapeProperties: properties =>
        set({ currentShapeProperties: properties }),

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

    clearProperties: () => set({ currentShapeProperties: null }),
}))
