import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { Command } from '@/engine/commands/Command'
import type CanvasManager from '@lib/core/CanvasManager'
import EngineStateStore from '@lib/core/EngineStateStore'

export interface EditorHandle {
    doc: DocumentModel
    bus: EngineBus<EngineEvents>
    run(cmd: Command): void
    undo(): void
    redo(): void
    canUndo(): boolean
    canRedo(): boolean
}

export function makeEditor(canvasManager: CanvasManager): EditorHandle {
    return {
        doc: EngineStateStore.getInstance().getDocument(),
        bus: canvasManager.bus,
        run: cmd => canvasManager.commandManager.run(cmd),
        undo: () => canvasManager.commandManager.undo(),
        redo: () => canvasManager.commandManager.redo(),
        canUndo: () => canvasManager.commandManager.canUndo,
        canRedo: () => canvasManager.commandManager.canRedo,
    }
}
