import type { Properties, ShapeType } from '@lib/types/shapes'

export type EntityId = string

export interface EntityRecord {
    id: EntityId
    type: ShapeType
    properties: Properties
    parentId: EntityId | null
    version: number // bumped on every property write
}
