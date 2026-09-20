import { DocumentModel } from './DocumentModel'
import type { EntityId, EntityRecord } from './entity'

export const FORMAT_VERSION = 1

export function toJSON(doc: DocumentModel): {
    formatVersion: number
    rootId: EntityId
    entities: EntityRecord[]
    order: Array<{ parentId: EntityId; children: EntityId[] }>
} {
    const childrenByParent = new Map<EntityId, EntityId[]>()
    for (const rec of doc.all()) {
        const parentId = doc.parentOf(rec.id)
        if (parentId === null) continue
        let children = childrenByParent.get(parentId)
        if (!children) {
            children = []
            childrenByParent.set(parentId, children)
        }
        children.push(rec.id)
    }
    const order: Array<{ parentId: EntityId; children: EntityId[] }> = []
    for (const [parentId, children] of childrenByParent) {
        children.sort((a, b) => doc.indexOf(a) - doc.indexOf(b))
        order.push({ parentId, children })
    }
    return {
        formatVersion: FORMAT_VERSION,
        rootId: doc.rootId,
        entities: [...doc.all()],
        order,
    }
}

export function fromJSON(json: ReturnType<typeof toJSON>): DocumentModel {
    if (json.formatVersion !== FORMAT_VERSION) {
        throw new Error(`Unsupported document format version ${json.formatVersion}`)
    }
    const doc = new DocumentModel()
    const recordsById = new Map<EntityId, EntityRecord>()
    for (const rec of json.entities) recordsById.set(rec.id, rec)
    for (const group of json.order) {
        group.children.forEach((child, index) => {
            const rec = recordsById.get(child)
            if (rec) doc.insert(rec, group.parentId, index)
        })
    }
    for (const rec of json.entities) {
        if (!doc.has(rec.id)) doc.insert(rec, doc.rootId)
    }
    return doc
}
