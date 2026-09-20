import { useMemo, type ReactNode } from 'react'
import { useCanvasManagerStore } from '@hooks/useCanvasManagerStore'
import { makeEditor } from './editor'
import { EditorContext } from './useEditor'

export const EditorProvider = ({ children }: { children: ReactNode }) => {
    const { canvasManager } = useCanvasManagerStore()
    const editor = useMemo(() => (canvasManager ? makeEditor(canvasManager) : null), [canvasManager])

    return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}
