import { describe, expect, test } from 'vitest'
import { createEditor } from '@/engine/createEditor'
import { CreateShape } from '@/engine/commands/CreateShape'
import { TranslateNodes } from '@/engine/commands/TranslateNodes'
import type { Properties } from '@lib/types/shapes'

const RECT: Partial<Properties> = {
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
    size: { width: 100, height: 100 },
}

describe('headless editor', () => {
    test('create, move, undo', () => {
        const editor = createEditor() // no canvas, no React

        const id = editor.run(new CreateShape('rect', RECT)) as string
        editor.run(new TranslateNodes([id], 40, 0))

        expect(editor.doc.get(id)!.properties.transform.x).toBe(40)

        editor.undo()
        expect(editor.doc.get(id)!.properties.transform.x).toBe(0)

        editor.redo()
        expect(editor.doc.get(id)!.properties.transform.x).toBe(40)
    })

    test('create, move, undo updates history flags', () => {
        const editor = createEditor()
        const id = editor.run(new CreateShape('rect', RECT)) as string
        editor.run(new TranslateNodes([id], 40, 0))

        expect(editor.canUndo()).toBe(true)
        expect(editor.canRedo()).toBe(false)

        editor.undo()
        expect(editor.doc.get(id)!.properties.transform.x).toBe(0)
        expect(editor.canUndo()).toBe(true)
        expect(editor.canRedo()).toBe(true)

        editor.redo()
        expect(editor.doc.get(id)!.properties.transform.x).toBe(40)
    })
})