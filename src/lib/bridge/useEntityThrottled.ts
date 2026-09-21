import { useEffect, useReducer, useRef } from 'react'
import type { EntityRecord } from '@/lib/engine/document/entity'
import { useEditor } from './useEditor'

export function useEntityThrottled(id: string | null, interval = 50): EntityRecord | null {
    const editor = useEditor()
    const [, force] = useReducer((x: number) => x + 1, 0)
    const forceRef = useRef(force)
    forceRef.current = force

    useEffect(() => {
        if (!editor || !id) return
        let timer: ReturnType<typeof setTimeout> | null = null
        const unsubscribe = editor.bus.on('document:changed', e => {
            if (!e.ids.includes(id)) return
            if (timer === null) {
                timer = setTimeout(() => {
                    timer = null
                    forceRef.current()
                }, interval)
            }
        })
        return () => {
            if (timer !== null) clearTimeout(timer)
            unsubscribe()
        }
    }, [editor, id, interval])

    return id && editor ? (editor.doc.get(id) ?? null) : null
}
