import { useEffect, useReducer } from 'react'
import type { EntityRecord } from '@/lib/engine/document/entity'
import { useEditor } from './useEditor'

export function useEntity(id: string | null): EntityRecord | null {
    const editor = useEditor()
    const [, force] = useReducer((x: number) => x + 1, 0)

    useEffect(() => {
        if (!editor || !id) return
        return editor.bus.on('document:changed', e => {
            if (e.ids.includes(id)) force()
        })
    }, [editor, id])

    return id && editor ? (editor.doc.get(id) ?? null) : null
}
