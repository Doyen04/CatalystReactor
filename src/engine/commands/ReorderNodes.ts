import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'

export class ReorderNodes implements Command {
    readonly label = 'Reorder'

    constructor(
        private id: EntityId,
        private index: number
    ) {}

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        doc.reorder(this.id, this.index)
    }
}
