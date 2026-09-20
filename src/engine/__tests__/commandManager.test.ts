import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocumentModel } from '@/engine/document/DocumentModel'
import { CommandManager } from '@/engine/commands/CommandManager'
import { CreateShape } from '@/engine/commands/CreateShape'
import { TranslateNodes } from '@/engine/commands/TranslateNodes'
import { UpdateProperties } from '@/engine/commands/UpdateProperties'
import { DeleteNodes } from '@/engine/commands/DeleteNodes'
import { EngineBus } from '@/engine/events/EngineBus'
import { setRenderRequest } from '@/engine/render/renderRequest'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { EntityId } from '@/engine/document/entity'
import type { Properties } from '@lib/types/shapes'

function rectProps(overrides: Partial<Properties> = {}): Partial<Properties> {
    return {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
        size: { width: 10, height: 10 },
        ...overrides,
    }
}

function createRect(commands: CommandManager): EntityId {
    const cmd = new CreateShape('rect', rectProps())
    commands.run(cmd)
    return cmd.resultId
}

function xOf(doc: DocumentModel, id: EntityId): number {
    return doc.get(id)!.properties.transform.x
}

describe('CommandManager', () => {
    afterEach(() => {
        setRenderRequest(null)
    })

    it('run applies a command and exposes canUndo/canRedo', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        expect(commands.canUndo).toBe(false)
        expect(commands.canRedo).toBe(false)

        const id = createRect(commands)

        expect(doc.get(id)!.properties.size).toEqual({ width: 10, height: 10 })
        expect(commands.canUndo).toBe(true)
        expect(commands.canRedo).toBe(false)
    })

    it('begin/apply/commit groups many applies into one undo unit', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.begin('Move', 'translate:mass')
        commands.apply(new TranslateNodes([id], 5, 0))
        commands.apply(new TranslateNodes([id], 7, 0))
        commands.apply(new TranslateNodes([id], 3, 0))
        commands.commit()

        expect(xOf(doc, id)).toBe(15)

        commands.undo()
        expect(xOf(doc, id)).toBe(0)
        expect(commands.canUndo).toBe(true)
    })

    it('run inside an open transaction applies without committing', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.begin('Move', 'translate:x')
        commands.run(new TranslateNodes([id], 5, 0))

        expect(xOf(doc, id)).toBe(5)

        commands.commit()

        commands.undo()
        expect(xOf(doc, id)).toBe(0)
    })

    it('undo/redo round-trips a committed command', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.run(new TranslateNodes([id], 42, 7))
        expect(xOf(doc, id)).toBe(42)

        commands.undo()
        expect(xOf(doc, id)).toBe(0)
        expect(commands.canRedo).toBe(true)

        commands.redo()
        expect(xOf(doc, id)).toBe(42)
        expect(commands.canRedo).toBe(false)
    })

    it('consecutive commands with the same mergeKey merge into one undo unit', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.run(new TranslateNodes([id], 10, 0))
        commands.run(new TranslateNodes([id], 10, 0))
        commands.run(new TranslateNodes([id], 10, 0))

        expect(xOf(doc, id)).toBe(30)

        commands.undo()
        expect(xOf(doc, id)).toBe(0)

        commands.redo()
        expect(xOf(doc, id)).toBe(30)
    })

    it('commands with distinct or absent mergeKeys stay separate undo units', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.run(new TranslateNodes([id], 10, 0))
        commands.run(new UpdateProperties(id, null, { size: { width: 99, height: 99 } }))
        commands.run(new TranslateNodes([id], 5, 0))

        expect(xOf(doc, id)).toBe(15)

        commands.undo()
        expect(xOf(doc, id)).toBe(10)

        commands.undo()
        expect(xOf(doc, id)).toBe(10)
        expect(doc.get(id)!.properties.size).toEqual({ width: 10, height: 10 })

        commands.undo()
        expect(xOf(doc, id)).toBe(0)
        expect(commands.canUndo).toBe(true)
    })

    it('abort reverts the open transaction and journals nothing', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const id = createRect(commands)

        commands.begin('Move', 'translate:x')
        commands.apply(new TranslateNodes([id], 50, 0))
        expect(xOf(doc, id)).toBe(50)

        commands.abort()

        expect(xOf(doc, id)).toBe(0)
        expect(doc.journalLength).toBe(1)
        expect(commands.canUndo).toBe(true)
    })

    it('commit and abort without an open transaction are no-ops', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())

        expect(() => commands.commit()).not.toThrow()
        expect(() => commands.abort()).not.toThrow()
        expect(commands.canUndo).toBe(false)
        expect(commands.canRedo).toBe(false)
    })

    it('undo stack is capped at 200, dropping the oldest entries', () => {
        const doc = new DocumentModel()
        const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
        const ids: EntityId[] = []
        for (let i = 0; i < 210; i++) {
            const cmd = new CreateShape('rect', rectProps())
            commands.run(cmd)
            ids.push(cmd.resultId)
        }
        for (const id of ids) {
            commands.run(new DeleteNodes([id]))
        }

        for (let i = 0; i < 200; i++) commands.undo()

        expect(commands.canUndo).toBe(false)
        for (let i = 0; i < 10; i++) expect(doc.has(ids[i])).toBe(false)
        for (let i = 10; i < 210; i++) expect(doc.has(ids[i])).toBe(true)
    })

    it('emits history:changed only when canUndo/canRedo change and requests a render', () => {
        const doc = new DocumentModel()
        const bus = new EngineBus<EngineEvents>()
        const commands = new CommandManager(doc, bus)
        const history = vi.fn()
        bus.on('history:changed', history)
        const render = vi.fn()
        setRenderRequest(render)

        commands.run(new CreateShape('rect', rectProps()))
        expect(history).toHaveBeenCalledTimes(1)
        expect(history).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false })
        expect(render).toHaveBeenCalledTimes(2)

        commands.undo()
        expect(history).toHaveBeenCalledTimes(2)
        expect(history).toHaveBeenLastCalledWith({ canUndo: false, canRedo: true })

        commands.redo()
        expect(history).toHaveBeenCalledTimes(3)
        expect(history).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false })

        commands.undo()
        expect(history).toHaveBeenCalledTimes(4)
        expect(history).toHaveBeenLastCalledWith({ canUndo: false, canRedo: true })

        commands.undo()
        commands.undo()
        expect(history).toHaveBeenCalledTimes(4)
    })
})
