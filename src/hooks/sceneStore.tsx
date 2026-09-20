import { create } from 'zustand'

interface SceneStore {
    selectedShapeId: string | null
    gridSize: number
    setSelectedShapeId: (id: string | null) => void
}

export const useSceneStore = create<SceneStore>(set => ({
    selectedShapeId: null,
    gridSize: 10,
    setSelectedShapeId: id => set({ selectedShapeId: id }),
}))
