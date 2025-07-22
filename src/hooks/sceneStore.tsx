import SceneNode from '@lib/core/SceneGraph'
import { create } from 'zustand'


interface SceneStore {
    selectedScene: SceneNode | null
    createdScene: SceneNode | null
    setSelectedScene: (scene: SceneNode | null) => void
    setCreatedScene: (scene: SceneNode | null) => void
    getActiveScene: () => SceneNode | null
}

export const useSceneStore = create<SceneStore>((set, get) => ({
    selectedScene: null,
    createdScene: null,
    setSelectedScene: (scene) => set({ selectedScene: scene }),
    setCreatedScene: (scene) => set({ createdScene: scene }),
    getActiveScene: () => {
        const { selectedScene, createdScene } = get()
        return selectedScene || createdScene
    }
}))