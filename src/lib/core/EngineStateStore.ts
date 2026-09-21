import type { Properties, ShapeType } from '@lib/types/shapes'
import { DocumentModel } from '@/lib/engine/document/DocumentModel'
import type { EntityRecord } from '@/lib/engine/document/entity'

export interface ShapeData {
    id: string
    type: ShapeType
    properties: Properties
    /** Document entity version; bumped on every journaled property change. Absent on plain (non-store) data. */
    readonly version?: number
}

class EngineStateStore {
    private doc: DocumentModel
    private views: Map<string, ShapeData> = new Map()
    private listeners: Set<(shapeId?: string) => void> = new Set()

    constructor(doc: DocumentModel) {
        this.doc = doc
    }

    private makeView(id: string, type: ShapeType): ShapeData {
        const doc = this.doc
        const view = {
            id,
            type,
            get properties() {
                return doc.get(id)!.properties
            },
            set properties(next: Properties) {
                doc.setProperties(id, next)
            },
        }
        // version is intentionally non-enumerable so the view keeps looking
        // like a plain {id, type, properties} shape (the old facade contract).
        Object.defineProperty(view, 'version', {
            enumerable: false,
            configurable: true,
            get: () => (doc.has(id) ? doc.get(id)!.version : -1),
        })
        return view as ShapeData
    }

    createShapeData(id: string, type: ShapeType, properties: Properties): ShapeData {
        const record: EntityRecord = { id, type, properties: structuredClone(properties), parentId: this.doc.rootId, version: 1 }
        this.doc.insert(record, this.doc.rootId)
        const view = this.makeView(id, type)
        this.views.set(id, view)
        return view
    }

    getShapeData(id: string): ShapeData | undefined {
        if (!this.doc.has(id)) return undefined
        let view = this.views.get(id)
        if (!view) {
            const type = this.doc.get(id)!.type
            view = this.makeView(id, type)
            this.views.set(id, view)
        }
        return view
    }

    getDocument(): DocumentModel {
        return this.doc
    }

    getAllShapeData(): ShapeData[] {
        return Array.from(this.doc.all(), rec => this.getShapeData(rec.id)!)
    }

    public removeShapeData(id: string) {
        const view = this.views.get(id)
        if (view) {
            const last = this.doc.has(id) ? this.doc.get(id)!.properties : undefined
            Object.defineProperty(view, 'properties', {
                value: last,
                writable: true,
                enumerable: true,
                configurable: true,
            })
        }
        if (this.doc.has(id)) this.doc.remove(id)
        this.views.delete(id)
        this.notify()
    }

    public subscribe(listener: (shapeId?: string) => void) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    public notify(shapeId?: string) {
        this.listeners.forEach(l => l(shapeId))
    }
}

export default EngineStateStore
