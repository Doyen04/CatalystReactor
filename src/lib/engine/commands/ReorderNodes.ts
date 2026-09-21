import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'

export class ReorderNodes implements Command {
    readonly label = 'Reorder'

    constructor(
        private id: EntityId,
        private index: number
    ) { }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        doc.reorder(this.id, this.index)
    }
}
