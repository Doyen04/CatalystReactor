import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'
import type { Properties } from '@lib/types/shapes'

export class EditPath implements Command {
    readonly label = 'Edit path'

    constructor(private id: EntityId, private oldProps: Partial<Properties>, private newProps: Partial<Properties>) { }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        doc.setPropertiesExplicit(this.id, this.oldProps, this.newProps)
    }
}