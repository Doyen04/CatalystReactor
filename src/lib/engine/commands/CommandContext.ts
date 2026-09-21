import type { DocumentModel } from '@/lib/engine/document/DocumentModel'

export interface CommandContext {
    readonly doc: DocumentModel
}