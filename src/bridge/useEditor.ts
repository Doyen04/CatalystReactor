import { createContext, useContext } from 'react'
import type { EditorHandle } from './editor'

export const EditorContext = createContext<EditorHandle | null>(null)

export const useEditor = () => {
    return useContext(EditorContext)
}
