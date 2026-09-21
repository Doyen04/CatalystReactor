import type { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { CommandContext } from '@/lib/engine/commands/CommandContext'

export interface Command {
    readonly label: string
    readonly mergeKey?: string
    apply(doc: DocumentModel, ctx: CommandContext): void
}