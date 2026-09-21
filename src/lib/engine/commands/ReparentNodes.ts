import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'

export class ReparentNodes implements Command {
    readonly label = 'Reorder'

    constructor(private ids: EntityId[], private parentId: EntityId, private index?: number) { }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        for (const id of this.ids) {
            const index = this.index ?? doc.childrenOf(this.parentId).length
            doc.reparent(id, this.parentId, index)
        }
    }
}