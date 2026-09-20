import { beforeEach, describe, expect, it, vi } from 'vitest'
import EngineStateStore from '../core/EngineStateStore'
import SText from '../shapes/primitives/SText'
import type PaintManager from '../core/PaintManager'
import { CanvasKitResources } from '../core/CanvasKitResource'
import type { Properties } from '../types/shapes'
import { DocumentModel } from '@/engine/document/DocumentModel'
import type { EntityId } from '@/engine/document/entity'
import { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '../core/EngineEvents'
import { CommandManager } from '@/engine/commands/CommandManager'
import { UpdateProperties } from '@/engine/commands/UpdateProperties'
import { TranslateNodes } from '@/engine/commands/TranslateNodes'

const props = (marker: string) => ({ marker }) as unknown as Properties

describe('EngineStateStore', () => {
    let store: EngineStateStore

    beforeEach(() => {
        store = new EngineStateStore(new DocumentModel())
    })

    it('createShapeData stores and returns the data; getShapeData and getAllShapeData include it', () => {
        const id = 'ess-stores-1'
        const shape = store.createShapeData(id, 'rect', props('initial'))

        expect(shape).toEqual({ id, type: 'rect', properties: props('initial') })
        expect(store.getShapeData(id)).toEqual(shape)
        expect(store.getAllShapeData()).toContainEqual(shape)
    })

    it('getShapeData returns undefined for an unknown id', () => {
        expect(store.getShapeData('ess-unknown-' + Date.now())).toBeUndefined()
    })

    it('removeShapeData deletes the data and notifies subscribers with an undefined argument', () => {
        const id = 'ess-removes-1'
        const shape = store.createShapeData(id, 'rect', props('initial'))
        const listener = vi.fn()
        const unsubscribe = store.subscribe(listener)

        store.removeShapeData(id)

        expect(store.getShapeData(id)).toBeUndefined()
        expect(store.getAllShapeData()).not.toContainEqual(shape)
        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith(undefined)
        unsubscribe()
    })

    it('subscribe returns an unsubscribe that detaches the listener', () => {
        const id = 'ess-unsub-1'
        store.createShapeData(id, 'rect', props('initial'))
        const listener = vi.fn()
        const unsubscribe = store.subscribe(listener)

        unsubscribe()

        store.notify(id)
        store.removeShapeData(id)
        expect(listener).not.toHaveBeenCalled()
    })

    it('notify(shapeId) calls every listener with that id', () => {
        const id = 'ess-notify-1'
        const first = vi.fn()
        const second = vi.fn()
        const unsubFirst = store.subscribe(first)
        const unsubSecond = store.subscribe(second)

        store.notify(id)

        expect(first).toHaveBeenCalledTimes(1)
        expect(first).toHaveBeenCalledWith(id)
        expect(second).toHaveBeenCalledTimes(1)
        expect(second).toHaveBeenCalledWith(id)
        unsubFirst()
        unsubSecond()
    })

    it('shape text setters route through the store view and journal into the document', () => {
        const getInstanceSpy = vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue(null as never)
        const id = `ess-stext-${Date.now()}`
        const data = store.createShapeData(id, 'text', {
            text: 'initial',
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
            size: { width: 0, height: 0 },
        } as Properties)
        const doc = store.getDocument()
        const before = doc.journalLength

        const shape = new SText(data, null as unknown as PaintManager)
        shape.setText('hello world')

        expect(doc.get(id)!.properties.text).toBe('hello world')
        expect(store.getShapeData(id)!.properties.text).toBe('hello world')
        expect(doc.journalLength).toBe(before + 1)
        getInstanceSpy.mockRestore()
    })
})

describe('CommandManager', () => {
    let doc: DocumentModel
    let bus: EngineBus<EngineEvents>
    let commands: CommandManager

    beforeEach(() => {
        doc = new DocumentModel()
        bus = new EngineBus<EngineEvents>()
        commands = new CommandManager(doc, bus)
    })

    const insertRect = (id: EntityId, properties: Properties) => {
        doc.insert({ id, type: 'rect', properties, parentId: doc.rootId, version: 1 }, doc.rootId)
    }

    const markerOf = (id: EntityId) => (doc.get(id)!.properties as unknown as { marker: string }).marker
    const transformOf = (id: EntityId) => (doc.get(id)!.properties as unknown as { transform: { x: number; y: number } }).transform

    it('run UpdateProperties pushes one undo step: undo reverts and redo re-applies', () => {
        insertRect('cm-prop-1', props('old'))

        commands.run(new UpdateProperties('cm-prop-1', props('old'), props('new')))
        expect(markerOf('cm-prop-1')).toBe('new')

        commands.undo()
        expect(markerOf('cm-prop-1')).toBe('old')

        commands.redo()
        expect(markerOf('cm-prop-1')).toBe('new')
    })

    it('run TranslateNodes moves a shape; undo restores and redo re-applies', () => {
        insertRect('cm-translate-1', { transform: { x: 10, y: 20 } } as unknown as Properties)

        commands.run(new TranslateNodes(['cm-translate-1'], 5, -3))
        expect(transformOf('cm-translate-1')).toEqual({ x: 15, y: 17 })

        commands.undo()
        expect(transformOf('cm-translate-1')).toEqual({ x: 10, y: 20 })

        commands.redo()
        expect(transformOf('cm-translate-1')).toEqual({ x: 15, y: 17 })
    })

    it('run advances canUndo, undo yields canRedo, redo restores canUndo', () => {
        insertRect('cm-flags-1', props('old'))
        commands.run(new UpdateProperties('cm-flags-1', props('old'), props('new')))

        expect(commands.canUndo).toBe(true)
        expect(commands.canRedo).toBe(false)

        commands.undo()
        expect(commands.canUndo).toBe(false)
        expect(commands.canRedo).toBe(true)

        commands.redo()
        expect(commands.canUndo).toBe(true)
        expect(commands.canRedo).toBe(false)
    })

    it('every command boundary emits history:changed to listeners', () => {
        insertRect('cm-bus-1', props('old'))
        const listener = vi.fn()
        const unsubscribe = bus.on('history:changed', listener)

        commands.run(new UpdateProperties('cm-bus-1', props('old'), props('new')))
        expect(listener).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false })

        commands.undo()
        expect(listener).toHaveBeenLastCalledWith({ canUndo: false, canRedo: true })

        commands.redo()
        expect(listener).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false })
        unsubscribe()
    })

    it('undo and redo on empty stacks do nothing', () => {
        expect(() => commands.undo()).not.toThrow()
        expect(() => commands.redo()).not.toThrow()
    })
})
