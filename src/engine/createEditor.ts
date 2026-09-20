import { DocumentModel } from '@/engine/document/DocumentModel'
import { CommandManager } from '@/engine/commands/CommandManager'
import { CreateShape } from '@/engine/commands/CreateShape'
import { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'

export interface Editor {
    doc: DocumentModel
    run(cmd: Command): EntityId | undefined
    undo(): void
    redo(): void
    canUndo(): boolean
    canRedo(): boolean
}

export function createEditor(): Editor {
    const doc = new DocumentModel()
    const commands = new CommandManager(doc, new EngineBus<EngineEvents>())
    return {
        doc,
        run(cmd) {
            commands.run(cmd)
            if (cmd instanceof CreateShape) return cmd.resultId
            return undefined
        },
        undo: () => commands.undo(),
        redo: () => commands.redo(),
        canUndo: () => commands.canUndo,
        canRedo: () => commands.canRedo,
    }
}