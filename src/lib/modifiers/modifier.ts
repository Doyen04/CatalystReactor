import { Coord, Size } from '@lib/types/shapes'

export interface ShapeData {
    position: Coord
    dimension: Size
    scale: Coord
    rotation: number
    rotationAnchor: Coord
    inverseWorldTransform: number[]
    worldTransform: number[]
    initialMouseAngle?: number
}
