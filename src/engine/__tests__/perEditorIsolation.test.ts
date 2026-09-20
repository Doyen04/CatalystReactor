import { describe, expect, test } from 'vitest'
import { createEditor } from '@/engine/createEditor'
import { CreateShape } from '@/engine/commands/CreateShape'
import { TranslateNodes } from '@/engine/commands/TranslateNodes'
import type { Properties } from '@lib/types/shapes'

const RECT: Partial<Properties> = {
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
    size: { width: 100, height: 100 },
}

describe('per-editor instances', () => {
    test('createEditor is headless and every instance is fresh', () => {
        const a = createEditor()
        const b = createEditor()

        expect(a.doc).not.toBe(b.doc)
        expect(a.doc).toBe(a.store.getDocument())
        expect(a.store).not.toBe(b.store)
        expect(a.bus).not.toBe(b.bus)
        expect(a.isAttached()).toBe(false)
    })

    test('two editors have independent documents and command stacks', () => {
        const a = createEditor()
        const b = createEditor()

        const idA = a.run(new CreateShape('rect', RECT)) as string
        const idB = b.run(new CreateShape('rect', { ...RECT, size: { width: 50, height: 50 } })) as string

        expect(a.doc.get(idA)!.properties.size.width).toBe(100)
        expect(b.doc.get(idB)!.properties.size.width).toBe(50)
        expect(a.doc.get(idB)).toBeUndefined()
        expect(b.doc.get(idA)).toBeUndefined()

        a.run(new TranslateNodes([idA], 40, 0))
        expect(a.doc.get(idA)!.properties.transform.x).toBe(40)
        expect(b.doc.get(idB)!.properties.transform.x).toBe(0)

        a.undo()
        expect(a.doc.get(idA)!.properties.transform.x).toBe(0)
        expect(a.canUndo()).toBe(true)
        expect(a.canRedo()).toBe(true)
        expect(b.canUndo()).toBe(true)
        expect(b.canRedo()).toBe(false)

        b.undo()
        expect(b.canRedo()).toBe(true)
        expect(b.doc.get(idB)).toBeUndefined()
        expect(a.doc.get(idA)).toBeDefined()

        a.redo()
        expect(a.doc.get(idA)!.properties.transform.x).toBe(40)
        expect(b.doc.get(idB)).toBeUndefined()
    })
})
