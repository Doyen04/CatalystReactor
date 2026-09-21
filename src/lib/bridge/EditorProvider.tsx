import { useEffect, useState, type ReactNode } from 'react'
import { createEditor, type Editor } from '@/lib/engine/createEditor'
import { EditorContext } from './useEditor'

export const EditorProvider = ({ children }: { children: ReactNode }) => {
    const [editor] = useState<Editor>(() => createEditor())
    useEffect(() => () => editor.dispose(), [editor])
    return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}
