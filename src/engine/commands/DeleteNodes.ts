import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'

export class DeleteNodes implements Command {
    readonly label = 'Delete'

    constructor(private ids: EntityId[]) {}

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        for (const id of this.ids) {
            doc.remove(id)
        }
    }
}