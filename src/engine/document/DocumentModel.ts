import type { EntityId, EntityRecord } from './entity'
import type { Properties } from '@lib/types/shapes'
import type { JournalEntry, JournalListener } from './journal'
import { invert } from './journal'

function clampIndex(index: number, length: number): number {
    if (index < 0) return 0
    if (index > length) return length
    return index
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== typeof b) return false
    if (a === null || b === null) return false
    if (typeof a !== 'object') return false
    const aKeys = Object.keys(a as Record<string, unknown>)
    const bKeys = Object.keys(b as Record<string, unknown>)
    if (aKeys.length !== bKeys.length) return false
    const entries = a as Record<string, unknown>
    const other = b as Record<string, unknown>
    for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(other, key)) return false
        if (!deepEqual(entries[key], other[key])) return false
    }
    return true
}

export class DocumentModel {
    private entities = new Map<EntityId, EntityRecord>()
    private order = new Map<EntityId, EntityId[]>()
    readonly rootId: EntityId = 'root'
    private journal: JournalEntry[] = []
    private journalListeners = new Set<JournalListener>()
    private pending: JournalEntry[] | null = null

    get(id: EntityId): EntityRecord | undefined {
        return this.entities.get(id)
    }

    has(id: EntityId): boolean {
        return this.entities.has(id)
    }

    childrenOf(id: EntityId): readonly EntityId[] {
        return this.order.get(id) ?? []
    }

    parentOf(id: EntityId): EntityId | null {
        const found = this.findParent(id)
        return found ? found[0] : null
    }

    indexOf(id: EntityId): number {
        const found = this.findParent(id)
        return found ? found[1] : -1
    }

    ancestorsOf(id: EntityId): EntityId[] {
        const ancestors: EntityId[] = []
        let current = this.parentOf(id)
        while (current !== null) {
            ancestors.push(current)
            current = this.parentOf(current)
        }
        return ancestors
    }

    descendantsOf(id: EntityId): EntityId[] {
        const result: EntityId[] = []
        const queue = [...this.childrenOf(id)]
        while (queue.length > 0) {
            const child = queue.shift()!
            result.push(child)
            queue.push(...this.childrenOf(child))
        }
        return result
    }

    all(): IterableIterator<EntityRecord> {
        return this.entities.values()
    }

    insert(record: EntityRecord, parentId: EntityId, index?: number): void {
        let order = this.order.get(parentId)
        if (!order) {
            order = []
            this.order.set(parentId, order)
        }
        const existing = order.indexOf(record.id)
        let at: number
        if (existing === -1) {
            at = index === undefined ? order.length : clampIndex(index, order.length)
            order.splice(at, 0, record.id)
        } else {
            at = existing
        }
        this.entities.set(record.id, record)
        this.record({ kind: 'insert', record, parentId, index: at })
    }

    remove(id: EntityId): void {
        const record = this.entities.get(id)
        if (!record) return
        const found = this.findParent(id)
        if (found) {
            const [parentId, index] = found
            this.order.get(parentId)!.splice(index, 1)
            this.entities.delete(id)
            this.record({ kind: 'remove', record, parentId, index })
        } else {
            this.entities.delete(id)
            this.record({ kind: 'remove', record, parentId: this.rootId, index: 0 })
        }
    }

    setProperties(id: EntityId, patch: Partial<Properties>): void {
        const rec = this.entities.get(id)
        if (!rec) return

        const props = rec.properties as unknown as Record<string, unknown>
        const patchOf = patch as unknown as Record<string, unknown>
        const before: Record<string, unknown> = {}
        const after: Record<string, unknown> = {}

        for (const key of Object.keys(patchOf)) {
            if (Object.is(props[key], patchOf[key])) continue
            before[key] = props[key]
            after[key] = patchOf[key]
            props[key] = patchOf[key]
        }

        if (Object.keys(after).length === 0) return

        rec.version++
        this.record({ kind: 'props', id, before: before as Partial<Properties>, after: after as Partial<Properties> })
    }

    reparent(id: EntityId, newParentId: EntityId, index: number): void {
        const found = this.findParent(id)
        if (!found) return
        const [oldParentId, oldIndex] = found
        if (oldParentId === newParentId && oldIndex === index) return
        this.order.get(oldParentId)!.splice(oldIndex, 1)
        let newOrder = this.order.get(newParentId)
        if (!newOrder) {
            newOrder = []
            this.order.set(newParentId, newOrder)
        }
        const at = clampIndex(index, newOrder.length)
        newOrder.splice(at, 0, id)
        this.record({ kind: 'reparent', id, from: [oldParentId, oldIndex], to: [newParentId, at] })
    }

    reorder(id: EntityId, index: number): void {
        const found = this.findParent(id)
        if (!found) return
        const [parentId, oldIndex] = found
        if (oldIndex === index) return
        const order = this.order.get(parentId)!
        order.splice(oldIndex, 1)
        const at = clampIndex(index, order.length)
        order.splice(at, 0, id)
        if (at !== oldIndex) {
            this.record({ kind: 'reparent', id, from: [parentId, oldIndex], to: [parentId, at] })
        }
    }

    /**
     * Journals the diff between an OLD and NEW property snapshot rather than
     * diffing against the current live props. Necessary because shapes mutate
     * their in-place `properties` object during a drag, so a no-op guard
     * against "current" would silently drop the change.
     */
    setPropertiesExplicit(id: EntityId, before: Partial<Properties>, after: Partial<Properties>): void {
        const rec = this.entities.get(id)
        if (!rec) return
        const props = rec.properties as unknown as Record<string, unknown>
        const beforeOf = before as unknown as Record<string, unknown>
        const afterOf = after as unknown as Record<string, unknown>
        const beforePatch: Record<string, unknown> = {}
        const afterPatch: Record<string, unknown> = {}

        for (const key of new Set([...Object.keys(beforeOf), ...Object.keys(afterOf)])) {
            if (deepEqual(beforeOf[key], afterOf[key])) continue
            beforePatch[key] = beforeOf[key]
            afterPatch[key] = afterOf[key]
        }
        for (const key of Object.keys(afterOf)) {
            props[key] = afterOf[key]
        }

        if (Object.keys(afterPatch).length === 0) return

        rec.version++
        this.record({
            kind: 'props',
            id,
            before: beforePatch as Partial<Properties>,
            after: afterPatch as Partial<Properties>,
        })
    }

    /**
     * Applies a journal entry's state effect WITHOUT recording it to the
     * journal or the pending transaction buffer. Used to replay undo/redo/
     * abort. Listeners are notified so projected trees (SceneManager) stay in
     * sync.
     */
    applyEntry(entry: JournalEntry): void {
        switch (entry.kind) {
            case 'props': {
                const rec = this.entities.get(entry.id)
                if (!rec) return
                const props = rec.properties as unknown as Record<string, unknown>
                for (const key of Object.keys(entry.after as unknown as Record<string, unknown>)) {
                    props[key] = (entry.after as unknown as Record<string, unknown>)[key]
                }
                rec.version++
                break
            }
            case 'insert': {
                let order = this.order.get(entry.parentId)
                if (!order) {
                    order = []
                    this.order.set(entry.parentId, order)
                }
                const existing = order.indexOf(entry.record.id)
                const at = existing === -1 ? clampIndex(entry.index, order.length) : existing
                if (existing === -1) {
                    order.splice(at, 0, entry.record.id)
                    this.entities.set(entry.record.id, entry.record)
                }
                break
            }
            case 'remove': {
                this.entities.delete(entry.record.id)
                const order = this.order.get(entry.parentId)
                if (!order) return
                const existing = order.indexOf(entry.record.id)
                if (existing !== -1) order.splice(existing, 1)
                break
            }
            case 'reparent': {
                for (const [, children] of this.order) {
                    const existing = children.indexOf(entry.id)
                    if (existing !== -1) {
                        children.splice(existing, 1)
                        break
                    }
                }
                let newOrder = this.order.get(entry.to[0])
                if (!newOrder) {
                    newOrder = []
                    this.order.set(entry.to[0], newOrder)
                }
                const at = clampIndex(entry.to[1], newOrder.length)
                newOrder.splice(at, 0, entry.id)
                break
            }
        }
        for (const listener of [...this.journalListeners]) listener(entry)
    }

    beginTransaction(): void {
        if (this.pending !== null) throw new Error('A transaction is already open')
        this.pending = []
    }

    commitTransaction(): JournalEntry[] {
        if (this.pending === null) throw new Error('No open transaction')
        const entries = this.pending
        this.pending = null
        for (const entry of entries) this.journal.push(entry)
        return entries
    }

    abortTransaction(): void {
        if (this.pending === null) return
        const entries = this.pending
        this.pending = null
        for (let i = entries.length - 1; i >= 0; i--) {
            this.applyEntry(invert(entries[i]))
        }
    }

    get isTransactionOpen(): boolean {
        return this.pending !== null
    }

    subscribeJournal(listener: JournalListener): () => void {
        this.journalListeners.add(listener)
        return () => {
            this.journalListeners.delete(listener)
        }
    }

    get journalLength(): number {
        return this.journal.length
    }

    private record(entry: JournalEntry): void {
        if (this.pending !== null) {
            this.pending.push(entry)
        } else {
            this.journal.push(entry)
        }
        for (const listener of [...this.journalListeners]) listener(entry)
    }

    private findParent(id: EntityId): [EntityId, number] | null {
        for (const [parentId, children] of this.order) {
            const index = children.indexOf(id)
            if (index !== -1) return [parentId, index]
        }
        return null
    }
}
