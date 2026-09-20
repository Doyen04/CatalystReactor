import type { EntityId, EntityRecord } from './entity'
import type { Properties } from '@lib/types/shapes'
import type { JournalEntry, JournalListener } from './journal'

function clampIndex(index: number, length: number): number {
    if (index < 0) return 0
    if (index > length) return length
    return index
}

export class DocumentModel {
    private entities = new Map<EntityId, EntityRecord>()
    private order = new Map<EntityId, EntityId[]>()
    readonly rootId: EntityId = 'root'
    private journal: JournalEntry[] = []
    private journalListeners = new Set<JournalListener>()

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
        this.journal.push(entry)
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
