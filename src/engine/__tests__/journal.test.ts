import { describe, expect, it } from 'vitest'
import { invert } from '@/engine/document/journal'
import type { JournalEntry } from '@/engine/document/journal'
import type { EntityRecord } from '@/engine/document/entity'
import type { Properties } from '@lib/types/shapes'

function baseProperties(overrides: Partial<Properties> = {}): Properties {
    return {
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
        size: { width: 10, height: 10 },
        style: {
            fill: { color: { type: 'solid', color: '#ffffff' }, opacity: 1 },
            stroke: { color: { type: 'solid', color: '#000000' }, opacity: 1, width: 1 },
        },
        ...overrides,
    }
}

function makeRecord(id: string, parentId: string | null): EntityRecord {
    return { id, type: 'rect', parentId, version: 1, properties: baseProperties() }
}

describe('invert', () => {
    it('props swaps before and after, keeping id and kind', () => {
        const entry: JournalEntry = {
            kind: 'props',
            id: 'a',
            before: { size: { width: 10, height: 10 } },
            after: { size: { width: 20, height: 10 } },
        }
        expect(invert(entry)).toEqual({
            kind: 'props',
            id: 'a',
            before: { size: { width: 20, height: 10 } },
            after: { size: { width: 10, height: 10 } },
        })
    })

    it('insert inverts to a remove with the same record, parentId and index', () => {
        const record = makeRecord('a', 'root')
        const entry: JournalEntry = { kind: 'insert', record, parentId: 'root', index: 2 }
        expect(invert(entry)).toEqual({ kind: 'remove', record, parentId: 'root', index: 2 })
    })

    it('remove inverts to an insert with the same record, parentId and index', () => {
        const record = makeRecord('a', 'root')
        const entry: JournalEntry = { kind: 'remove', record, parentId: 'root', index: 2 }
        expect(invert(entry)).toEqual({ kind: 'insert', record, parentId: 'root', index: 2 })
    })

    it('reparent swaps from and to, keeping id and kind', () => {
        const entry: JournalEntry = { kind: 'reparent', id: 'a', from: ['root', 0], to: ['frame', 1] }
        expect(invert(entry)).toEqual({ kind: 'reparent', id: 'a', from: ['frame', 1], to: ['root', 0] })
    })

    it('invert is an involution for props entries', () => {
        const entry: JournalEntry = {
            kind: 'props',
            id: 'a',
            before: { size: { width: 10, height: 10 } },
            after: { size: { width: 40, height: 10 } },
        }
        expect(invert(invert(entry))).toEqual(entry)
    })

    it('invert is an involution for insert entries', () => {
        const record = makeRecord('a', 'root')
        const entry: JournalEntry = { kind: 'insert', record, parentId: 'root', index: 1 }
        expect(invert(invert(entry))).toEqual(entry)
    })

    it('invert is an involution for remove entries', () => {
        const record = makeRecord('a', 'root')
        const entry: JournalEntry = { kind: 'remove', record, parentId: 'frame', index: 3 }
        expect(invert(invert(entry))).toEqual(entry)
    })

    it('invert is an involution for reparent entries', () => {
        const entry: JournalEntry = { kind: 'reparent', id: 'a', from: ['root', 1], to: ['frame', 0] }
        expect(invert(invert(entry))).toEqual(entry)
    })
})
