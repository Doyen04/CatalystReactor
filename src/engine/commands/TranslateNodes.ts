import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'

export class TranslateNodes implements Command {
    readonly label = 'Move'
    readonly mergeKey: string

    constructor(private ids: EntityId[], private dx: number, private dy: number) {
        this.mergeKey = `translate:${[...this.ids].sort().join(',')}`
    }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        for (const id of this.ids) {
            const transform = doc.get(id)?.properties.transform
            if (!transform) continue
            const next = { ...transform, x: transform.x + this.dx, y: transform.y + this.dy }
            doc.setProperties(id, { transform: next })
        }
    }
}