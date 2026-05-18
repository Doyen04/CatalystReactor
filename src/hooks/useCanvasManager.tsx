import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import type CanvasManager from '@lib/core/CanvasManager'
import type ShapeManager from '@lib/core/ShapeManager'

type CanvasManagerState = {
    canvasManager: CanvasManager | null
    shapeManager: ShapeManager | null
    setCanvasManager: (manager: CanvasManager | null) => void
}

const CanvasManagerContext = createContext<CanvasManagerState | undefined>(undefined)

export const CanvasManagerProvider = ({ children }: { children: ReactNode }) => {
    const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null)

    const value = useMemo(
        () => ({
            canvasManager,
            shapeManager: canvasManager?.shapeManager ?? null,
            setCanvasManager,
        }),
        [canvasManager]
    )

    return <CanvasManagerContext.Provider value={value}>{children}</CanvasManagerContext.Provider>
}

export const useCanvasManagerStore = () => {
    const context = useContext(CanvasManagerContext)
    if (!context) {
        throw new Error('useCanvasManagerStore must be used within a CanvasManagerProvider')
    }
    return context
}
