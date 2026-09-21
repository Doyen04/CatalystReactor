import { afterEach, describe, expect, it } from 'vitest'
import { DocumentModel } from '@/lib/engine/document/DocumentModel'
import { CommandManager } from '@/lib/engine/commands/CommandManager'
import { UpdateProperties } from '@/lib/engine/commands/UpdateProperties'
import { EngineBus } from '@/lib/engine/events/EngineBus'
import { setRenderRequest } from '@/lib/engine/render/renderRequest'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { PathData, PathPoint, Properties } from '@lib/types/shapes'
import type { EntityId } from '@/lib/engine/document/entity'

function pathData(points: { x: number; y: number; smooth?: boolean }[], closed = false): PathData {
    return { points: points as PathPoint[], closed }
}

/**
 * Mirrors the journaled draw lifecycle used by PathTool. The tool inserts the
 * record inside an open transaction and mutates pathData in place, then either
 * commits the diff (a valid path) or aborts (an incomplete/cancelled one).
 */
function beginDraw(
    doc: DocumentModel,
    commands: CommandManager,
    id: EntityId,
    initialPath?: Properties
): { shape: Properties; before: Properties } {
    commands.begin('Draw line', null)
    const shape: Properties =
        initialPath ?? {
            transform: { x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
            size: { width: 0, height: 0 },
            style: {
                fill: { color: { type: 'solid', color: '#000000' }, opacity: 1 },
                stroke: { color: { type: 'solid', color: '#000000' }, opacity: 1, width: 1 },
            },
        }
    const record = {
        id,
        type: 'line' as const,
        properties: shape,
        parentId: doc.rootId,
        version: 1,
    }
    doc.insert(record, doc.rootId)
    const before = structuredClone(doc.get(id)!.properties)
    return { shape, before }
}

function commitDraw(commands: CommandManager, id: EntityId, shape: Properties, before: Properties): void {
    commands.apply(new UpdateProperties(id, before, structuredClone(shape)))
    commands.commit()
}

describe('journaled vector draw (Step 10)', () => {
    afterEach(() => {
        setRenderRequest(null)
    })

    it('a valid path is one undoable step: commit then undo removes the record', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        const { shape, before } = beginDraw(doc, commands, 'drawn-path')
        shape.pathData = pathData([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }])

        commitDraw(commands, 'drawn-path', shape, before)
        expect(doc.get('drawn-path')).toBeDefined()
        expect(doc.get('drawn-path')!.properties.pathData).toEqual(pathData([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }]))
        expect(commands.canUndo).toBe(true)

        commands.undo()
        expect(doc.get('drawn-path')).toBeUndefined()
        expect(commands.canRedo).toBe(true)

        commands.redo()
        const restored = doc.get('drawn-path')!
        expect(restored).toBeDefined()
        expect(restored.properties.pathData).toEqual(pathData([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }]))
    })

    it('abort reverts the insert so an incomplete draw leaves no record and no undo step', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        const { shape } = beginDraw(doc, commands, 'drawn-path')
        shape.pathData = pathData([{ x: 0, y: 0 }])
        expect(doc.get('drawn-path')).toBeDefined()

        commands.abort()
        expect(doc.get('drawn-path')).toBeUndefined()
        expect(commands.canUndo).toBe(false)
        expect(doc.journalLength).toBe(0)

        // A subsequent draw still works after the abort
        const { shape: shape2, before: before2 } = beginDraw(doc, commands, 'drawn-path')
        shape2.pathData = pathData([{ x: 0, y: 0 }, { x: 10, y: 10 }])
        commitDraw(commands, 'drawn-path', shape2, before2)
        expect(doc.get('drawn-path')).toBeDefined()
        expect(commands.canUndo).toBe(true)
    })

    it('opening a second transaction while one is open throws (no nested draws)', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        beginDraw(doc, commands, 'drawn-path')
        expect(() => commands.begin('Draw line', null)).toThrow(/already open/)
        commands.abort()
    })

    it('consecutive draws with a null mergeKey are separate undo steps', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        const a = beginDraw(doc, commands, 'a')
        a.shape.pathData = pathData([{ x: 0, y: 0 }, { x: 5, y: 5 }])
        commitDraw(commands, 'a', a.shape, a.before)

        const b = beginDraw(doc, commands, 'b')
        b.shape.pathData = pathData([{ x: 0, y: 0 }, { x: 20, y: 5 }])
        commitDraw(commands, 'b', b.shape, b.before)

        expect(commands.canUndo).toBe(true)
        commands.undo()
        expect(doc.get('b')).toBeUndefined()
        expect(doc.get('a')).toBeDefined()
        commands.undo()
        expect(doc.get('a')).toBeUndefined()
    })

    it('two rapid draws of the same type are not coalesced into one undo step', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        const first = beginDraw(doc, commands, 'first')
        first.shape.pathData = pathData([{ x: 0, y: 0 }, { x: 1, y: 1 }])
        commitDraw(commands, 'first', first.shape, first.before)

        const second = beginDraw(doc, commands, 'second')
        second.shape.pathData = pathData([{ x: 0, y: 0 }, { x: 9, y: 9 }])
        commitDraw(commands, 'second', second.shape, second.before)

        // Each draw pushed its own transaction regardless of label
        expect(doc.journalLength).toBe(4)
        commands.undo()
        expect(doc.get('first')).toBeDefined()
    })

    it('diff journaling restores the pre-draw properties exactly after undo', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const initial = {
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
            size: { width: 1, height: 1 },
            style: {
                fill: { color: { type: 'solid' as const, color: '#000000' }, opacity: 1 },
                stroke: { color: { type: 'solid' as const, color: '#000000' }, opacity: 1, width: 1 },
            },
            pathData: pathData([]),
        }

        const { shape, before } = beginDraw(doc, commands, 'drawn-path', initial)
        shape.pathData = pathData([{ x: 0, y: 0 }, { x: 30, y: 0 }])

        commitDraw(commands, 'drawn-path', shape, before)

        commands.undo()
        const restored = doc.get('drawn-path')
        expect(restored).toBeUndefined()
        commands.redo()
        expect(doc.get('drawn-path')!.properties.pathData).toEqual(pathData([{ x: 0, y: 0 }, { x: 30, y: 0 }]))
    })
})