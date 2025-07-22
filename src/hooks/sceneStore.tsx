import SceneNode from '@lib/core/SceneGraph'
import { create } from 'zustand'


interface SceneStore {
    currentScene: SceneNode | null
    setCurrentScene: (scene: SceneNode | null) => void
    getActiveScene: () => SceneNode | null
}

export const useSceneStore = create<SceneStore>((set, get) => ({
    currentScene: null,
    setCurrentScene: (scene) => set({ currentScene: scene }),
    getActiveScene: () => {
        const { currentScene } = get()
        return currentScene
    }
}))