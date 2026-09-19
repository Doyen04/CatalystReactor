import { useState, useMemo, ReactNode } from 'react'
import type CanvasManager from '@lib/core/CanvasManager'
import { CanvasManagerContext } from './useCanvasManagerStore'

// Component-only module. The context + the useCanvasManagerStore consumer hook
// live in ./useCanvasManagerStore (a non-component module) so this file passes
// react-refresh's only-export-components rule.
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
