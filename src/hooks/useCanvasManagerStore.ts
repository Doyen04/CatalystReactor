import { createContext, useContext } from 'react'
import type CanvasManager from '@lib/core/CanvasManager'
import type ShapeManager from '@lib/core/ShapeManager'

type CanvasManagerState = {
    canvasManager: CanvasManager | null
    shapeManager: ShapeManager | null
    setCanvasManager: (manager: CanvasManager | null) => void
}

export const CanvasManagerContext = createContext<CanvasManagerState | undefined>(undefined)

// Standalone file that owns the context object + consumer hook, and nothing else.
// The Provider component lives in ./useCanvasManager (a component-only module), which
// imports CanvasManagerContext from here. Splitting ensures each file exports only one
// category (hook / component), which satisfies react-refresh/only-export-components.
export const useCanvasManagerStore = () => {
    const context = useContext(CanvasManagerContext)
    if (!context) {
        throw new Error('useCanvasManagerStore must be used within a CanvasManagerProvider')
    }
    return context
}
