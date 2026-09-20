import type { EntityId, EntityRecord } from './entity'
import type { Properties } from '@lib/types/shapes'

export type JournalEntry =
    | { kind: 'props'; id: EntityId; before: Partial<Properties>; after: Partial<Properties> }
    | { kind: 'insert'; record: EntityRecord; parentId: EntityId; index: number }
    | { kind: 'remove'; record: EntityRecord; parentId: EntityId; index: number }
    | { kind: 'reparent'; id: EntityId; from: [EntityId, number]; to: [EntityId, number] }

export type JournalListener = (entry: JournalEntry) => void

export function invert(entry: JournalEntry): JournalEntry {
    switch (entry.kind) {
        case 'props':
            return { kind: 'props', id: entry.id, before: entry.after, after: entry.before }
        case 'insert':
            return { ...entry, kind: 'remove' }
        case 'remove':
            return { ...entry, kind: 'insert' }
        case 'reparent':
            return { kind: 'reparent', id: entry.id, from: entry.to, to: entry.from }
    }
}
