import { beforeEach, describe, expect, it, vi } from 'vitest'
import EngineStateStore from '../core/EngineStateStore'
import HistoryManager, { UpdateShapeAction } from '../core/HistoryManager'
import type { Properties } from '../types/shapes'

const engineState = () => EngineStateStore.getInstance()
const history = () => HistoryManager.getInstance()

const props = (marker: string) => ({ marker }) as unknown as Properties

describe('EngineStateStore', () => {
    it('createShapeData stores and returns the data; getShapeData and getAllShapeData include it', () => {
        const id = 'ess-stores-1'
        const shape = engineState().createShapeData(id, 'rect', props('initial'))

        expect(shape).toEqual({ id, type: 'rect', properties: props('initial') })
        expect(engineState().getShapeData(id)).toEqual(shape)
        expect(engineState().getAllShapeData()).toContainEqual(shape)
    })

    it('getShapeData returns undefined for an unknown id', () => {
        expect(engineState().getShapeData('ess-unknown-' + Date.now())).toBeUndefined()
    })

    it('removeShapeData deletes the data and notifies subscribers with an undefined argument', () => {
        const id = 'ess-removes-1'
        const shape = engineState().createShapeData(id, 'rect', props('initial'))
        const listener = vi.fn()
        const unsubscribe = engineState().subscribe(listener)

        engineState().removeShapeData(id)

        expect(engineState().getShapeData(id)).toBeUndefined()
        expect(engineState().getAllShapeData()).not.toContainEqual(shape)
        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith(undefined)
        unsubscribe()
    })

    it('subscribe returns an unsubscribe that detaches the listener', () => {
        const id = 'ess-unsub-1'
        engineState().createShapeData(id, 'rect', props('initial'))
        const listener = vi.fn()
        const unsubscribe = engineState().subscribe(listener)

        unsubscribe()

        engineState().notify(id)
        engineState().removeShapeData(id)
        expect(listener).not.toHaveBeenCalled()
    })

    it('notify(shapeId) calls every listener with that id', () => {
        const id = 'ess-notify-1'
        const first = vi.fn()
        const second = vi.fn()
        const unsubFirst = engineState().subscribe(first)
        const unsubSecond = engineState().subscribe(second)

        engineState().notify(id)

        expect(first).toHaveBeenCalledTimes(1)
        expect(first).toHaveBeenCalledWith(id)
        expect(second).toHaveBeenCalledTimes(1)
        expect(second).toHaveBeenCalledWith(id)
        unsubFirst()
        unsubSecond()
    })
})

describe('HistoryManager', () => {
    beforeEach(() => history().clear())

    it('undo calls the action undo and redo calls its redo', () => {
        const undo = vi.fn()
        const redo = vi.fn()
        history().pushAction({ type: 'TEST', undo, redo })

        history().undo()
        history().redo()

        expect(undo).toHaveBeenCalledTimes(1)
        expect(redo).toHaveBeenCalledTimes(1)
    })

    it('undo moves the action to the redo stack and redo returns it to the undo stack', () => {
        const undo = vi.fn()
        const redo = vi.fn()
        history().pushAction({ type: 'TEST', undo, redo })

        history().undo()
        history().undo()
        history().redo()
        history().redo()

        expect(undo).toHaveBeenCalledTimes(1)
        expect(redo).toHaveBeenCalledTimes(1)
    })

    it('pushing a new action clears the redo stack so redo does nothing', () => {
        const redo = vi.fn()
        history().pushAction({ type: 'TEST', undo: vi.fn(), redo })
        history().undo()

        history().pushAction({ type: 'NEW', undo: vi.fn(), redo: vi.fn() })
        history().redo()

        expect(redo).not.toHaveBeenCalled()
    })

    it('undo and redo on empty stacks do nothing', () => {
        expect(() => history().undo()).not.toThrow()
        expect(() => history().redo()).not.toThrow()
    })

    it('UpdateShapeAction restore old on undo and new on redo, notifying listeners', () => {
        const id = 'hm-update-1'
        const oldProps = props('old')
        const newProps = props('new')
        engineState().createShapeData(id, 'rect', oldProps)
        const listener = vi.fn()
        const unsubscribe = engineState().subscribe(listener)

        history().pushAction(new UpdateShapeAction(id, oldProps, newProps))

        history().undo()
        expect(engineState().getShapeData(id)?.properties).toEqual(oldProps)
        expect(engineState().getShapeData(id)?.properties).not.toEqual(newProps)
        expect(listener).toHaveBeenLastCalledWith(id)

        history().redo()
        expect(engineState().getShapeData(id)?.properties).toEqual(newProps)
        expect(engineState().getShapeData(id)?.properties).not.toEqual(oldProps)
        expect(listener).toHaveBeenLastCalledWith(id)
        unsubscribe()
    })
})