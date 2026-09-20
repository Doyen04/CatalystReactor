import type { DocumentModel } from '@/engine/document/DocumentModel'

export interface CommandContext {
    readonly doc: DocumentModel
}