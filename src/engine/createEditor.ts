import { DocumentModel } from '@/engine/document/DocumentModel'
import { CommandManager } from '@/engine/commands/CommandManager'
import { CreateShape } from '@/engine/commands/CreateShape'
import { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'
import { ServiceContainer } from '@lib/core/DependencyManager'
import EngineStateStore from '@lib/core/EngineStateStore'
import { SnapManager } from '@lib/core/SnapManager'
import PaintManager from '@lib/core/PaintManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import CanvasManager from '@lib/core/CanvasManager'
import type { ToolType } from '@lib/tools/toolTypes'

export interface Editor {
    doc: DocumentModel
    bus: EngineBus<EngineEvents>
    store: EngineStateStore
    isAttached(): boolean
    attach(canvas: HTMLCanvasElement): CanvasManager
    detach(): void
    dispose(): void
    setTool(tool: ToolType | string): void
    setGridSize(size: number): void
    run(cmd: Command): EntityId | undefined
    undo(): void
    redo(): void
    canUndo(): boolean
    canRedo(): boolean
}

export function createEditor(): Editor {
    const bus = new EngineBus<EngineEvents>()
    const doc = new DocumentModel()
    const store = new EngineStateStore(doc)
    const commandManager = new CommandManager(doc, bus)
    const container = new ServiceContainer()
    const snap = new SnapManager()

    container.register('commandManager', commandManager)

    let live: CanvasManager | null = null
    let paintManager: PaintManager | null = null
    let shapeModifier: ShapeModifier | null = null

    const attach = (canvas: HTMLCanvasElement): CanvasManager => {
        if (live) throw new Error('editor is already attached')
        paintManager = new PaintManager()
        container.register('paintManager', paintManager)
        shapeModifier = new ShapeModifier(container)
        container.register('shapeModifier', shapeModifier)
        live = new CanvasManager(canvas, {
            container,
            doc,
            store,
            bus,
            commandManager,
            paintManager,
            shapeModifier,
            snap,
        })
        return live
    }

    const detach = (): void => {
        live?.destroy()
        live = null
    }

    return {
        doc,
        bus,
        store,
        isAttached: () => live !== null,
        attach,
        detach,
        dispose: () => {
            detach()
            shapeModifier?.destroy()
            paintManager?.destroy()
            container.clear()
        },
        setTool: (tool: ToolType | string) => {
            live?.setTool(tool)
        },
        setGridSize: (size: number) => {
            live?.setGridSize(size)
        },
        run(cmd) {
            commandManager.run(cmd)
            if (cmd instanceof CreateShape) return cmd.resultId
            return undefined
        },
        undo: () => commandManager.undo(),
        redo: () => commandManager.redo(),
        canUndo: () => commandManager.canUndo,
        canRedo: () => commandManager.canRedo,
    }
}
