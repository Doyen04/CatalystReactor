import { useEffect, useReducer, useRef } from 'react'
import { useEditor } from './useEditor'

export function useDocumentRevision(interval = 100): number {
    const editor = useEditor()
    const [revision, force] = useReducer((x: number) => x + 1, 0)
    const forceRef = useRef(force)
    forceRef.current = force

    useEffect(() => {
        if (!editor) return
        let timer: ReturnType<typeof setTimeout> | null = null
        const unsubscribe = editor.bus.on('document:changed', () => {
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
    }, [editor, interval])

    return revision
}
