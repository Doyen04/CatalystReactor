import { describe, expect, it, vi } from 'vitest'
import { DocumentModel } from '@/engine/document/DocumentModel'
import { FORMAT_VERSION, fromJSON, toJSON } from '@/engine/document/serialize'
import type { EntityRecord } from '@/engine/document/entity'
import { invert, type JournalEntry } from '@/engine/document/journal'
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

function makeRecord(id: string, parentId: string | null, version = 1): EntityRecord {
    return { id, type: 'rect', parentId, version, properties: baseProperties() }
}

function insertTwoLevels(doc: DocumentModel): void {
    doc.insert(makeRecord('a', 'root'), doc.rootId)
    doc.insert(makeRecord('frame', 'root'), doc.rootId)
    doc.insert(makeRecord('child', 'frame'), 'frame')
}

function collectJournal(doc: DocumentModel): JournalEntry[] {
    const received: JournalEntry[] = []
    doc.subscribeJournal(entry => received.push(entry))
    return received
}

describe('DocumentModel queries', () => {
    it('get returns the record and undefined for unknown ids', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        doc.insert(rec, doc.rootId)

        expect(doc.get('a')).toBe(rec)
        expect(doc.get('ghost')).toBeUndefined()
    })

    it('has reports presence', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), doc.rootId)

        expect(doc.has('a')).toBe(true)
        expect(doc.has('ghost')).toBe(false)
    })

    it('childrenOf returns ordered children and an empty array for unknown parents', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root', 0)

        expect(doc.childrenOf('root')).toEqual(['b', 'a'])
        expect(doc.childrenOf('ghost')).toEqual([])
    })

    it('parentOf returns the parent and null for root or unknown ids', () => {
        const doc = new DocumentModel()
        insertTwoLevels(doc)

        expect(doc.parentOf('child')).toBe('frame')
        expect(doc.parentOf('a')).toBe('root')
        expect(doc.parentOf('root')).toBeNull()
        expect(doc.parentOf('ghost')).toBeNull()
    })

    it('indexOf returns the index within the parent and -1 elsewhere', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        expect(doc.indexOf('a')).toBe(0)
        expect(doc.indexOf('b')).toBe(1)
        expect(doc.indexOf('root')).toBe(-1)
        expect(doc.indexOf('ghost')).toBe(-1)
    })

    it('ancestorsOf walks up, nearest first, excluding the node', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('frame', 'root'), 'root')
        doc.insert(makeRecord('inner', 'frame'), 'frame')
        doc.insert(makeRecord('leaf', 'inner'), 'inner')

        expect(doc.ancestorsOf('leaf')).toEqual(['inner', 'frame', 'root'])
        expect(doc.ancestorsOf('a')).toEqual(['root'])
        expect(doc.ancestorsOf('root')).toEqual([])
        expect(doc.ancestorsOf('ghost')).toEqual([])
    })

    it('descendantsOf walks the subtree breadth-first and excludes the node', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('frame', 'root'), 'root')
        doc.insert(makeRecord('child', 'frame'), 'frame')
        doc.insert(makeRecord('grandchild', 'child'), 'child')

        expect(doc.descendantsOf('root')).toEqual(['a', 'frame', 'child', 'grandchild'])
        expect(doc.descendantsOf('frame')).toEqual(['child', 'grandchild'])
        expect(doc.descendantsOf('leaf-missing')).toEqual([])
    })

    it('an id appears in only one parent order list at a time', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.reparent('a', 'b', 0)

        expect(doc.parentOf('a')).toBe('b')
        expect(doc.childrenOf('b')).toEqual(['a'])
        expect(doc.childrenOf('root')).toEqual(['b'])
        expect(doc.indexOf('a')).toBe(0)
    })

    it('all iterates every record', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        expect([...doc.all()].map(rec => rec.id)).toEqual(['a', 'b'])
    })
})

describe('DocumentModel insert', () => {
    it('insert appends when no index is given', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root')

        expect(doc.childrenOf('root')).toEqual(['a', 'b', 'c'])
        expect(doc.indexOf('c')).toBe(2)
    })

    it('insert respects the given index and clamps out-of-range indices', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root', 1)
        doc.insert(makeRecord('d', 'root'), 'root', 99)

        expect(doc.childrenOf('root')).toEqual(['a', 'c', 'b', 'd'])
    })

    it('insert creates the order list for an unknown parent', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('child', 'frame'), 'frame')

        expect(doc.childrenOf('frame')).toEqual(['child'])
        expect(doc.parentOf('child')).toBe('frame')
    })

    it('insert with an existing id replaces the record but keeps its position', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root', 0)
        doc.insert(makeRecord('b', 'root'), 'root', 0)
        const replacement = makeRecord('a', 'root', 9)
        doc.insert(replacement, 'root')

        expect(doc.childrenOf('root')).toEqual(['b', 'a'])
        expect(doc.get('a')).toBe(replacement)
    })

    it('insert journals an entry with the actual index', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)

        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root', 0)

        expect(received).toEqual([
            { kind: 'insert', record: doc.get('a'), parentId: 'root', index: 0 },
            { kind: 'insert', record: doc.get('b'), parentId: 'root', index: 1 },
            { kind: 'insert', record: doc.get('c'), parentId: 'root', index: 0 },
        ])
        expect(doc.journalLength).toBe(3)
    })
})

describe('DocumentModel remove', () => {
    it('remove detaches the record from entities and its parent order', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        doc.remove('a')

        expect(doc.has('a')).toBe(false)
        expect(doc.get('a')).toBeUndefined()
        expect(doc.childrenOf('root')).toEqual(['b'])
        expect(doc.parentOf('a')).toBeNull()
        expect(doc.indexOf('a')).toBe(-1)
    })

    it('remove journals the snapshot taken before removal', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        const received = collectJournal(doc)
        doc.insert(rec, 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        received.splice(0)

        doc.remove('a')

        expect(received).toEqual([{ kind: 'remove', record: rec, parentId: 'root', index: 0 }])
    })

    it('remove on an unknown id is a no-op with no journal entry', () => {
        const doc = new DocumentModel()

        expect(() => doc.remove('ghost')).not.toThrow()
        expect(doc.journalLength).toBe(0)
    })
})

describe('DocumentModel setProperties', () => {
    it('mutates the properties object in place and bumps version once', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        const properties = rec.properties
        doc.insert(rec, 'root')

        doc.setProperties('a', { size: { width: 20, height: 10 }, transform: baseProperties().transform })

        const after = doc.get('a')!
        expect(after.properties).toBe(properties)
        expect(after.properties.size).toEqual({ width: 20, height: 10 })
        expect(rec.version).toBe(2)
    })

    it('journals only changed keys with before/after snapshots', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        const received = collectJournal(doc)
        doc.insert(rec, 'root')
        received.splice(0)
        const sameTransform = rec.properties.transform

        doc.setProperties('a', { size: { width: 20, height: 10 }, transform: sameTransform })

        expect(received).toHaveLength(1)
        expect(received[0].kind).toBe('props')
        if (received[0].kind === 'props') {
            expect(received[0].id).toBe('a')
            expect(received[0].before).toEqual({ size: { width: 10, height: 10 } })
            expect(received[0].after).toEqual({ size: { width: 20, height: 10 } })
        }
        expect(received[0]).toEqual({
            kind: 'props',
            id: 'a',
            before: { size: { width: 10, height: 10 } },
            after: { size: { width: 20, height: 10 } },
        })
    })

    it('no-op writes journal nothing', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        doc.insert(rec, 'root')
        const sameTransform = rec.properties.transform

        doc.setProperties('a', { size: { width: 20, height: 10 } })
        expect(doc.journalLength).toBe(2)
        expect(doc.get('a')!.version).toBe(2)

        const sameSize = doc.get('a')!.properties.size
        doc.setProperties('a', { size: sameSize, transform: sameTransform })
        doc.setProperties('a', {})

        expect(doc.journalLength).toBe(2)
        expect(doc.get('a')!.version).toBe(2)
    })

    it('setProperties on an unknown id is a no-op with no journal entry', () => {
        const doc = new DocumentModel()

        expect(() => doc.setProperties('ghost', { size: { width: 20, height: 10 } })).not.toThrow()
        expect(doc.journalLength).toBe(0)
    })
})

describe('DocumentModel reparent', () => {
    it('moves an id between parents and journals from/to', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('frame', 'root'), 'root')
        received.splice(0)

        doc.reparent('a', 'frame', 0)

        expect(doc.parentOf('a')).toBe('frame')
        expect(doc.indexOf('a')).toBe(0)
        expect(doc.childrenOf('root')).toEqual(['b', 'frame'])
        expect(doc.childrenOf('frame')).toEqual(['a'])
        expect(received).toEqual([{ kind: 'reparent', id: 'a', from: ['root', 0], to: ['frame', 0] }])
    })

    it('reparent to an unknown parent creates its order list', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        doc.reparent('a', 'ghost', 0)

        expect(doc.parentOf('a')).toBe('ghost')
        expect(doc.childrenOf('ghost')).toEqual(['a'])
        expect(doc.childrenOf('root')).toEqual(['b'])
    })

    it('reparent on an unknown id is a no-op with no journal entry', () => {
        const doc = new DocumentModel()

        expect(() => doc.reparent('ghost', 'root', 0)).not.toThrow()
        expect(doc.journalLength).toBe(0)
    })

    it('same-parent same-index reparent is a no-op', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        doc.reparent('a', 'root', 0)

        expect(doc.childrenOf('root')).toEqual(['a', 'b'])
        expect(doc.journalLength).toBe(2)
    })

    it('same-parent different-index reparent reorders within the parent', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root')
        received.splice(0)

        doc.reparent('c', 'root', 1)

        expect(doc.childrenOf('root')).toEqual(['a', 'c', 'b'])
        expect(received).toEqual([{ kind: 'reparent', id: 'c', from: ['root', 2], to: ['root', 1] }])
    })
})

describe('DocumentModel reorder', () => {
    it('moves an id within its current parent', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root')

        doc.reorder('c', 0)

        expect(doc.childrenOf('root')).toEqual(['c', 'a', 'b'])
    })

    it('reorder journals a same-parent reparent entry', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root')
        const received = collectJournal(doc)

        doc.reorder('c', 0)

        expect(doc.childrenOf('root')).toEqual(['c', 'a', 'b'])
        expect(received).toEqual([{ kind: 'reparent', id: 'c', from: ['root', 2], to: ['root', 0] }])
    })

    it('reorder on an unknown id or to the same index is a no-op', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        expect(() => doc.reorder('ghost', 0)).not.toThrow()
        doc.reorder('a', 0)

        expect(doc.childrenOf('root')).toEqual(['a', 'b'])
        expect(doc.journalLength).toBe(2)
    })

    it('a journaled reorder inverts and replays via applyEntry', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.insert(makeRecord('c', 'root'), 'root')
        const received = collectJournal(doc)

        doc.reorder('c', 0)
        expect(doc.childrenOf('root')).toEqual(['c', 'a', 'b'])

        const entry = received[0]
        doc.applyEntry(invert(entry))
        expect(doc.childrenOf('root')).toEqual(['a', 'b', 'c'])

        doc.applyEntry(entry)
        expect(doc.childrenOf('root')).toEqual(['c', 'a', 'b'])
    })
})

describe('DocumentModel journal plumbing', () => {
    it('journalLength exposes the buffered entry count', () => {
        const doc = new DocumentModel()
        expect(doc.journalLength).toBe(0)
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        expect(doc.journalLength).toBe(2)
    })

    it('subscribers receive entries in dispatch order', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)

        doc.insert(makeRecord('a', 'root'), 'root')
        doc.setProperties('a', { transform: baseProperties().transform })
        doc.remove('a')

        expect(received.map(entry => entry.kind)).toEqual(['insert', 'props', 'remove'])
        expect(doc.journalLength).toBe(3)
    })

    it('unsubscribe stops dispatch to that listener only', () => {
        const doc = new DocumentModel()
        const first = vi.fn()
        const second = vi.fn()
        const unsubscribe = doc.subscribeJournal(first)
        doc.subscribeJournal(second)

        doc.insert(makeRecord('a', 'root'), 'root')
        unsubscribe()
        doc.insert(makeRecord('b', 'root'), 'root')

        expect(first).toHaveBeenCalledTimes(1)
        expect(second).toHaveBeenCalledTimes(2)
    })

    it('multiple subscribers each receive every entry', () => {
        const doc = new DocumentModel()
        const first = vi.fn()
        const second = vi.fn()
        doc.subscribeJournal(first)
        doc.subscribeJournal(second)

        doc.insert(makeRecord('a', 'root'), 'root')

        expect(first).toHaveBeenCalledTimes(1)
        expect(second).toHaveBeenCalledTimes(1)
    })
})

describe('DocumentModel transactions', () => {
    it('record() during an open transaction buffers into pending, not the journal', () => {
        const doc = new DocumentModel()
        doc.beginTransaction()
        const received = collectJournal(doc)

        doc.insert(makeRecord('a', 'root'), 'root')
        doc.setProperties('a', { size: { width: 20, height: 10 } })

        expect(doc.journalLength).toBe(0)
        expect(received.map(entry => entry.kind)).toEqual(['insert', 'props'])
        expect(doc.isTransactionOpen).toBe(true)

        const entries = doc.commitTransaction()
        expect(entries).toHaveLength(2)
        expect(doc.journalLength).toBe(2)
        expect(doc.isTransactionOpen).toBe(false)
    })

    it('commitTransaction throws with no open transaction', () => {
        const doc = new DocumentModel()
        expect(() => doc.commitTransaction()).toThrow()
    })

    it('beginTransaction throws when one is already open', () => {
        const doc = new DocumentModel()
        doc.beginTransaction()
        expect(() => doc.beginTransaction()).toThrow()
        doc.abortTransaction()
    })

    it('abortTransaction reverts the state to the pre-transaction snapshot in reverse', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('frame', 'root'), 'root')
        doc.beginTransaction()

        doc.insert(makeRecord('a', 'frame'), 'frame')
        doc.setProperties('a', { size: { width: 99, height: 99 } })

        doc.abortTransaction()

        expect(doc.has('a')).toBe(false)
        expect(doc.get('frame')).toEqual(makeRecord('frame', 'root'))
        expect(doc.journalLength).toBe(1)
        expect(doc.isTransactionOpen).toBe(false)
    })

    it('abortTransaction is a no-op without an open transaction', () => {
        const doc = new DocumentModel()
        expect(() => doc.abortTransaction()).not.toThrow()
    })

    it('nested structural changes are fully reverted on abort (insert + reparent)', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')
        doc.beginTransaction()

        doc.reparent('a', 'b', 0)
        doc.insert(makeRecord('c', 'root'), 'root')

        doc.abortTransaction()

        expect(doc.parentOf('a')).toBe('root')
        expect(doc.childrenOf('root')).toEqual(['a', 'b'])
        expect(doc.has('c')).toBe(false)
    })
})

describe('DocumentModel applyEntry', () => {
    it('replays a props entry (e.g. undo) without journaling, bumping version', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        const received = collectJournal(doc)
        doc.insert(rec, 'root')
        received.splice(0)
        doc.setProperties('a', { size: { width: 20, height: 10 } })
        const propsEntry = received[0] as Extract<JournalEntry, { kind: 'props' }>

        const listeners = collectJournal(doc)
        doc.applyEntry(invert(propsEntry))

        expect(doc.get('a')!.properties.size).toEqual({ width: 10, height: 10 })
        expect(doc.journalLength).toBe(2)
        expect(listeners).toHaveLength(1)
    })

    it('replays an insert entry without journaling', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        const entry: JournalEntry = { kind: 'insert', record: rec, parentId: 'root', index: 0 }

        doc.applyEntry(entry)

        expect(doc.get('a')).toBe(rec)
        expect(doc.childrenOf('root')).toEqual(['a'])
        expect(doc.journalLength).toBe(0)
    })

    it('replays a remove entry without journaling', () => {
        const doc = new DocumentModel()
        const rec = makeRecord('a', 'root')
        doc.insert(rec, 'root')

        doc.applyEntry({ kind: 'remove', record: rec, parentId: 'root', index: 0 })

        expect(doc.has('a')).toBe(false)
        expect(doc.childrenOf('root')).toEqual([])
        expect(doc.journalLength).toBe(1)
    })

    it('replays a reparent entry without journaling', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('b', 'root'), 'root')

        doc.applyEntry({ kind: 'reparent', id: 'a', from: ['root', 0], to: ['b', 1] })

        expect(doc.parentOf('a')).toBe('b')
        expect(doc.journalLength).toBe(2)
    })
})

describe('DocumentModel setPropertiesExplicit', () => {
    it('journals the diff between before/after regardless of current props', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)
        doc.insert(makeRecord('a', 'root'), 'root')
        received.splice(0)

        // Simulates a drag: the shape already mutated its props in place, but
        // the command still wants to journal old -> new explicitly.
        doc.setPropertiesExplicit('a', { size: { width: 10, height: 10 } }, { size: { width: 50, height: 50 } })

        expect(received).toHaveLength(1)
        expect(received[0].kind).toBe('props')
        if (received[0].kind === 'props') {
            expect(received[0].before).toEqual({ size: { width: 10, height: 10 } })
            expect(received[0].after).toEqual({ size: { width: 50, height: 50 } })
        }
        expect(doc.get('a')!.properties.size).toEqual({ width: 50, height: 50 })
        expect(doc.get('a')!.version).toBe(2)
    })

    it('journals only the keys that differ between before/after', () => {
        const doc = new DocumentModel()
        const received = collectJournal(doc)
        doc.insert(makeRecord('a', 'root'), 'root')
        received.splice(0)

        doc.setPropertiesExplicit(
            'a',
            { size: { width: 10, height: 10 }, transform: baseProperties().transform },
            { size: { width: 40, height: 40 }, transform: baseProperties().transform }
        )

        expect(received).toHaveLength(1)
        if (received[0].kind === 'props') {
            expect(received[0].before).toEqual({ size: { width: 10, height: 10 } })
            expect(received[0].after).toEqual({ size: { width: 40, height: 40 } })
        }
    })

    it('identical before/after journals nothing', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')

        doc.setPropertiesExplicit('a', { size: { width: 10, height: 10 } }, { size: { width: 10, height: 10 } })

        expect(doc.journalLength).toBe(1)
    })

    it('setPropertiesExplicit on an unknown id is a no-op', () => {
        const doc = new DocumentModel()

        expect(() => doc.setPropertiesExplicit('ghost', {}, { size: { width: 20, height: 20 } })).not.toThrow()
        expect(doc.journalLength).toBe(0)
    })
})

describe('DocumentModel serialize', () => {
    it('toJSON produces the envelope with format version and rootId', () => {
        const doc = new DocumentModel()
        insertTwoLevels(doc)

        const json = toJSON(doc)
        expect(json.formatVersion).toBe(FORMAT_VERSION)
        expect(json.rootId).toBe('root')
        expect(json.entities).toHaveLength(3)
        expect(json.order).toEqual([
            { parentId: 'root', children: ['a', 'frame'] },
            { parentId: 'frame', children: ['child'] },
        ])
    })

    it('fromJSON round-trips entities, order and rootId', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('a', 'root'), 'root')
        doc.insert(makeRecord('frame', 'root', 7), 'root')
        doc.insert(makeRecord('child', 'frame'), 'frame')
        doc.reparent('a', 'frame', 0)
        doc.setProperties('child', { size: { width: 33, height: 12 } })

        const roundTripped = fromJSON(toJSON(doc))

        expect(roundTripped.rootId).toBe('root')
        expect([...roundTripped.all()].map(rec => rec.id).sort()).toEqual(['a', 'child', 'frame'])
        expect(roundTripped.childrenOf('frame')).toEqual(['a', 'child'])
        expect(roundTripped.parentOf('a')).toBe('frame')
        expect(roundTripped.get('a')!.properties).toEqual(doc.get('a')!.properties)
        expect(roundTripped.get('child')!.properties.size).toEqual({ width: 33, height: 12 })
        expect(roundTripped.get('frame')!.version).toBe(7)
        expect(roundTripped.get('child')!.version).toBe(2)
    })

    it('fromJSON throws on a mismatched format version', () => {
        const doc = new DocumentModel()
        insertTwoLevels(doc)

        expect(() => fromJSON({ ...toJSON(doc), formatVersion: 99 })).toThrow()
    })

    it('round-trip preserves a complex index arrangement', () => {
        const doc = new DocumentModel()
        doc.insert(makeRecord('c', 'root'), 'root')
        doc.insert(makeRecord('a', 'root'), 'root', 0)
        doc.insert(makeRecord('b', 'root'), 'root', 1)
        doc.reparent('a', 'c', 0)

        const roundTripped = fromJSON(toJSON(doc))

        expect(roundTripped.childrenOf('c')).toEqual(['a'])
        expect(roundTripped.childrenOf('root')).toEqual(['b', 'c'])
    })
})
