import { beforeEach, describe, expect, it } from 'vitest'
import { DocumentModel } from '@/engine/document/DocumentModel'
import { CommandManager } from '@/engine/commands/CommandManager'
import { CreateShape } from '@/engine/commands/CreateShape'
import { TranslateNodes } from '@/engine/commands/TranslateNodes'
import { UpdateProperties } from '@/engine/commands/UpdateProperties'
import { DeleteNodes } from '@/engine/commands/DeleteNodes'
import { ReparentNodes } from '@/engine/commands/ReparentNodes'
import { ReorderNodes } from '@/engine/commands/ReorderNodes'
import { EditPath } from '@/engine/commands/EditPath'
import { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { EntityId } from '@/engine/document/entity'
import type { Properties } from '@lib/types/shapes'

let doc: DocumentModel
let commands: CommandManager

beforeEach(() => {
    doc = new DocumentModel()
    commands = new CommandManager(doc, new EngineBus<EngineEvents>())
})

function rectProps(overrides: Partial<Properties> = {}): Partial<Properties> {
    return {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
        size: { width: 10, height: 10 },
        ...overrides,
    }
}

function createRect(props: Partial<Properties> = rectProps(), parentId?: EntityId): EntityId {
    const cmd = new CreateShape('rect', props, parentId)
    commands.run(cmd)
    return cmd.resultId
}

describe('CreateShape', () => {
    it('inserts a record at the root with merged default properties', () => {
        const id = createRect({ size: { width: 400, height: 200 } })

        const rec = doc.get(id)!
        expect(rec.type).toBe('rect')
        expect(rec.parentId).toBe('root')
        expect(doc.parentOf(id)).toBe('root')
        expect(rec.properties.size).toEqual({ width: 400, height: 200 })
        expect(rec.properties.transform).toEqual(rectProps().transform)
        expect(rec.properties.style).toBeDefined()
        expect(rec.version).toBe(1)
    })

    it('parentId defaults to the root and undo removes the node', () => {
        const id = createRect()

        expect(doc.has(id)).toBe(true)
        expect(doc.parentOf(id)).toBe('root')

        commands.undo()
        expect(doc.has(id)).toBe(false)

        commands.redo()
        expect(doc.has(id)).toBe(true)
    })

    it('an explicit parentId inserts directly under that parent', () => {
        const frame = createRect()
        const child = new CreateShape('rect', rectProps(), frame)
        commands.run(child)

        expect(doc.parentOf(child.resultId)).toBe(frame)

        commands.undo()
        expect(doc.has(child.resultId)).toBe(false)

        commands.redo()
        expect(doc.parentOf(child.resultId)).toBe(frame)
    })

    it('exposes label, mergeKey and a generated resultId', () => {
        const cmd = new CreateShape('rect', rectProps())

        expect(cmd.label).toBe('Create')
        expect(cmd.mergeKey).toBe('create:rect')
        expect(cmd.resultId).toBeDefined()
    })
})

describe('TranslateNodes', () => {
    it('moves each id and undoes back to the start', () => {
        const a = createRect()
        const b = createRect()

        commands.run(new TranslateNodes([a, b], 10, 5))

        expect(doc.get(a)!.properties.transform).toEqual({ x: 10, y: 5, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null })
        expect(doc.get(b)!.properties.transform.x).toBe(10)

        commands.undo()
        expect(doc.get(a)!.properties.transform.x).toBe(0)
        expect(doc.get(b)!.properties.transform.x).toBe(0)

        commands.redo()
        expect(doc.get(a)!.properties.transform.x).toBe(10)
    })

    it('ids that do not exist are skipped without journaling', () => {
        commands.run(new TranslateNodes(['ghost'], 10, 0))

        expect(commands.canUndo).toBe(false)
        expect(doc.journalLength).toBe(0)
    })
})

describe('UpdateProperties', () => {
    it('with null oldProps diffs against live properties', () => {
        const id = createRect()

        commands.run(new UpdateProperties(id, null, { size: { width: 77, height: 33 } }))

        expect(doc.get(id)!.properties.size).toEqual({ width: 77, height: 33 })

        commands.undo()
        expect(doc.get(id)!.properties.size).toEqual({ width: 10, height: 10 })

        commands.redo()
        expect(doc.get(id)!.properties.size).toEqual({ width: 77, height: 33 })
    })

    it('with oldProps journals the explicit before/after snapshot', () => {
        const id = createRect()
        doc.get(id)!.properties.size = { width: 50, height: 50 }

        commands.run(new UpdateProperties(id, { size: { width: 10, height: 10 } }, { size: { width: 50, height: 50 } }))

        expect(doc.get(id)!.properties.size).toEqual({ width: 50, height: 50 })

        commands.undo()
        expect(doc.get(id)!.properties.size).toEqual({ width: 10, height: 10 })
    })
})

describe('DeleteNodes', () => {
    it('removes each id and undo restores them under the old parent', () => {
        const a = createRect()
        const b = createRect()

        commands.run(new DeleteNodes([a, b]))

        expect(doc.has(a)).toBe(false)
        expect(doc.has(b)).toBe(false)

        commands.undo()
        expect(doc.has(a)).toBe(true)
        expect(doc.has(b)).toBe(true)
        expect(doc.parentOf(a)).toBe('root')

        commands.redo()
        expect(doc.has(a)).toBe(false)
        expect(doc.has(b)).toBe(false)
    })

    it('ids that do not exist are a no-op', () => {
        commands.run(new DeleteNodes(['ghost', 'phantom']))

        expect(commands.canUndo).toBe(false)
        expect(doc.journalLength).toBe(0)
    })
})

describe('ReparentNodes', () => {
    it('moves ids under a new parent and undo restores the old one', () => {
        const a = createRect()
        const frame = createRect()

        commands.run(new ReparentNodes([a], frame))

        expect(doc.parentOf(a)).toBe(frame)
        expect(doc.indexOf(a)).toBe(0)

        commands.undo()
        expect(doc.parentOf(a)).toBe('root')

        commands.redo()
        expect(doc.parentOf(a)).toBe(frame)
    })

    it('appends multiple ids in order when no index is given', () => {
        const a = createRect()
        const b = createRect()
        const frame = createRect()

        commands.run(new ReparentNodes([a, b], frame))

        expect(doc.childrenOf(frame)).toEqual([a, b])
    })

    it('an explicit index is applied to the first id', () => {
        const a = createRect()
        const b = createRect()
        const frame = createRect()

        commands.run(new ReparentNodes([a], frame, 0))
        commands.run(new ReparentNodes([b], frame, 0))

        expect(doc.childrenOf(frame)).toEqual([b, a])
    })
})

describe('ReorderNodes', () => {
    it('reorders within the current parent via a journaled reparent', () => {
        const a = createRect()
        const b = createRect()
        const c = createRect()

        commands.run(new ReorderNodes(c, 0))

        expect(doc.childrenOf('root')).toEqual([c, a, b])

        commands.undo()
        expect(doc.childrenOf('root')).toEqual([a, b, c])

        commands.redo()
        expect(doc.childrenOf('root')).toEqual([c, a, b])
    })

    it('a parentless id is a no-op', () => {
        commands.run(new ReorderNodes('ghost', 0))

        expect(commands.canUndo).toBe(false)
    })
})

describe('EditPath', () => {
    it('writes path data through the explicit snapshot and undoes', () => {
        const id = createRect()
        const oldProps: Partial<Properties> = { pathData: { points: [], closed: false } }
        const newProps: Partial<Properties> = { pathData: { points: [{ x: 0, y: 0 }], closed: false } }

        commands.run(new EditPath(id, oldProps, newProps))

        expect(doc.get(id)!.properties.pathData).toEqual(newProps.pathData)

        commands.undo()
        expect(doc.get(id)!.properties.pathData).toEqual(oldProps.pathData)

        commands.redo()
        expect(doc.get(id)!.properties.pathData).toEqual(newProps.pathData)
    })
})