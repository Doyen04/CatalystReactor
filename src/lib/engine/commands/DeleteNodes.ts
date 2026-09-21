import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'

export class DeleteNodes implements Command {
    readonly label = 'Delete'

    constructor(private ids: EntityId[]) { }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        for (const id of this.ids) {
            doc.remove(id)
        }
    }
}