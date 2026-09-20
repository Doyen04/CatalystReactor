import type { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'
import type { Command } from '@/engine/commands/Command'
import type { EntityId, EntityRecord } from '@/engine/document/entity'
import type { Properties, ShapeType } from '@lib/types/shapes'

let nextShapeId = 1

function nextEntityId(): EntityId {
    return `shape-${nextShapeId++}`
}

const DEFAULT_PROPERTIES: Properties = {
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
    size: { width: 0, height: 0 },
    style: {
        fill: { color: { type: 'solid', color: '#D9D9D9' }, opacity: 1 },
        stroke: { color: { type: 'solid', color: '#000000' }, opacity: 1, width: 1 },
    },
}

export class CreateShape implements Command {
    readonly label = 'Create'
    readonly mergeKey: string
    resultId: EntityId

    constructor(private type: string, private value: Partial<Properties>, private parentId?: EntityId) {
        this.mergeKey = `create:${this.type}`
        this.resultId = nextEntityId()
    }

    apply(doc: DocumentModel, _ctx: CommandContext): void {
        const record: EntityRecord = {
            id: this.resultId,
            type: this.type as ShapeType,
            properties: { ...DEFAULT_PROPERTIES, ...this.value },
            parentId: this.parentId ?? doc.rootId,
            version: 1,
        }
        doc.insert(record, this.parentId ?? doc.rootId)
    }
}