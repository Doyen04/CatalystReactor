import { beforeEach, describe, expect, it, vi } from 'vitest'
import SText from '../shapes/primitives/SText'
import type PaintManager from '../core/PaintManager'
import { CanvasKitResources } from '../core/CanvasKitResource'
import type { Properties } from '../types/shapes'
import { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { EntityId } from '@/lib/engine/document/entity'
import { EngineBus } from '@/lib/engine/events/EngineBus'
import type { EngineEvents } from '../core/EngineEvents'
import { CommandManager } from '@/lib/engine/commands/CommandManager'
import { UpdateProperties } from '@/lib/engine/commands/UpdateProperties'
import { TranslateNodes } from '@/lib/engine/commands/TranslateNodes'

const props = (marker: string) => ({ marker }) as unknown as Properties

describe('DocumentModel shape views', () => {
    let doc: DocumentModel

    beforeEach(() => {
        doc = new DocumentModel()
    })

    it('createShape stores a clone and returns a live view; getShapeData/getAllShapeData share its identity', () => {
        const id = 'dmv-stores-1'
        const view = doc.createShape('rect', props('initial'), doc.rootId, id)

        expect(view).toEqual({ id, type: 'rect', properties: props('initial') })
        expect(doc.getShapeData(id)).toBe(view)
        expect(doc.getAllShapeData()).toContain(view)
        expect(doc.get(id)!.version).toBe(1)

        const seed = props('initial') as unknown as { marker: string }
        seed.marker = 'mutated'
        expect((doc.get(id)!.properties as unknown as { marker: string }).marker).toBe('initial')
    })

    it('getShapeData returns undefined for an unknown id', () => {
        expect(doc.getShapeData('dmv-unknown-' + Date.now())).toBeUndefined()
    })

    it('remove evicts the cached view; a stale view still reads its last snapshot', () => {
        const id = 'dmv-remove-1'
        const view = doc.createShape('rect', props('initial'), doc.rootId, id)

        doc.remove(id)

        expect(doc.getShapeData(id)).toBeUndefined()
        expect(doc.getAllShapeData()).not.toContain(view)
        expect(view.properties).toEqual(props('initial'))
        expect(view.version).toBe(-1)
    })

    it('version is non-enumerable so the view looks like a plain shape data', () => {
        const view = doc.createShape('rect', props('x'), doc.rootId, 'dmv-version-1')

        expect(Object.keys(view)).not.toContain('version')
        expect(view.version).toBe(1)
    })

    it('shape writes through the view setter journal into the document and bump the version', () => {
        const id = 'dmv-write-1'
        const view = doc.createShape('rect', props('old'), doc.rootId, id)
        const before = doc.journalLength

        view.properties = { ...view.properties, marker: 'new' } as Properties

        expect((doc.get(id)!.properties as unknown as { marker: string }).marker).toBe('new')
        expect(doc.getShapeData(id)!.properties).toEqual({ ...props('old'), marker: 'new' })
        expect(view.version).toBe(2)
        expect(doc.journalLength).toBe(before + 1)
    })

    it('shape text setters route through the view and journal into the document', () => {
        const getInstanceSpy = vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue(null as never)
        const id = `dmv-stext-${Date.now()}`
        const data = doc.createShape(
            'text',
            {
                text: 'initial',
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
                size: { width: 0, height: 0 },
            } as Properties,
            doc.rootId,
            id
        )
        const before = doc.journalLength

        const shape = new SText(data, null as unknown as PaintManager)
        shape.setText('hello world')

        expect(doc.get(id)!.properties.text).toBe('hello world')
        expect(doc.getShapeData(id)!.properties.text).toBe('hello world')
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
