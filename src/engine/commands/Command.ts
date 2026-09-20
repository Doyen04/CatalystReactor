import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'

export interface Command {
    readonly label: string
    readonly mergeKey?: string
    apply(doc: DocumentModel, ctx: CommandContext): void
}