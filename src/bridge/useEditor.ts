import { createContext, useContext } from 'react'
import type { Editor } from '@/engine/createEditor'

export const EditorContext = createContext<Editor | null>(null)

export const useEditor = () => {
    return useContext(EditorContext)
}
