import { DocumentModel } from '@/lib/engine/document/DocumentModel'
import { CommandManager } from '@/lib/engine/commands/CommandManager'
import { CreateShape } from '@/lib/engine/commands/CreateShape'
import { EngineBus } from '@/lib/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'
import { SnapManager } from '@lib/core/SnapManager'
import PaintManager from '@lib/core/PaintManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import CanvasManager from '@lib/core/CanvasManager'
import type { ToolType } from '@lib/tools/toolTypes'
import type ShapeManager from '@lib/core/ShapeManager'
import type SceneManager from '@lib/core/SceneManager'

export interface Editor {
    doc: DocumentModel
    bus: EngineBus<EngineEvents>
    sceneManager(): SceneManager | null
    shapeManager(): ShapeManager | null
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
    const commandManager = new CommandManager(doc, bus)
    const snap = new SnapManager()

    let live: CanvasManager | null = null

    const attach = (canvas: HTMLCanvasElement): CanvasManager => {
        if (live) throw new Error('editor is already attached')
        const paintManager = new PaintManager()
        const shapeModifier = new ShapeModifier(paintManager)
        live = new CanvasManager(canvas, { doc, bus, commandManager, paintManager, shapeModifier, snap })
        return live
    }

    const detach = (): void => {
        live?.destroy()
        live = null
    }

    return {
        doc,
        bus,
        sceneManager: () => live?.sceneManager ?? null,
        shapeManager: () => live?.shapeManager ?? null,
        isAttached: () => live !== null,
        attach,
        detach,
        dispose: detach,
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
