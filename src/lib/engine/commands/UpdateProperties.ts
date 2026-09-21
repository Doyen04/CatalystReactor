import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'
import type { Command } from '@/lib/engine/commands/Command'
import type { EntityId } from '@/lib/engine/document/entity'
import type { Properties } from '@lib/types/shapes'

export class UpdateProperties implements Command {
    readonly label = 'Properties'
    readonly mergeKey: string

    constructor(private id: EntityId, private oldProps: Partial<Properties> | null, private newProps: Partial<Properties>) {
        this.mergeKey = `props:${this.id}`
    }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        if (this.oldProps !== null) {
            doc.setPropertiesExplicit(this.id, this.oldProps, this.newProps)
        } else {
            doc.setProperties(this.id, this.newProps)
        }
    }
}