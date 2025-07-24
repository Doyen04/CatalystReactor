import SceneNode from '@lib/core/SceneGraph'
import { Properties } from '@lib/types/shapes'
import { create } from 'zustand'

interface SceneStore {
    currentScene: SceneNode | null
    currentShapeProperties: Properties | null
    setCurrentScene: (scene: SceneNode | null) => void
    setCurrentShapeProperties: (properties: Properties | null) => void
    updateProperty: (key: string, value: any) => void
    clearProperties: () => void
    clearCurrentScene: () => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
    currentScene: null,
    currentShapeProperties: null,

    setCurrentScene: (scene) => {
        set({
            currentScene: scene,
            currentShapeProperties: scene.getShape()?.getProperties()
        })
    },

    setCurrentShapeProperties: (properties) => set({ currentShapeProperties: properties }),

    updateProperty: (key, value) => set((state) => {
        if (!state.currentShapeProperties) return state
        
        const shape = state.currentScene.getShape();
        if (shape) {
            const currentProps = shape.getProperties();
            shape.setProperties({
                ...currentProps,
                [key]: value
            });
        }
        return {
            currentShapeProperties: {
                ...state.currentShapeProperties,
                [key]: value
            }
        }
    }),

    clearCurrentScene: () => set({ currentScene: null }),
    clearProperties: () => set({ currentShapeProperties: null })
}))