// export function safeSetBorderRadius(shape: IShape, radius: number, position: HandlePos): boolean {
//     if (hasRadius(shape)) {
//         shape.setBorderRadius(radius, position)
//         return true
//     }
//     console.warn(`Shape ${shape.getShapeType()} does not support border radius`)
//     return false
// }

// export function safeSetArc(shape: IShape, start: number, end: number): boolean {
//     if (isArcShape(shape)) {
//         shape.setArc(start, end)
//         return true
//     }
//     console.warn(`Shape ${shape.getShapeType()} does not support arc angles`)
//     return false
// }

// export function safeSetVertexCount(shape: IShape, count: number): boolean {
//     if (isPolygonal(shape)) {
//         shape.setVertexCount(count)
//         return true
//     }
//     console.warn(`Shape ${shape.getShapeType()} does not support vertex count`)
//     return false
// }
// import { IArcShape } from '@lib/types/capabilities'

// class Circle extends Shape implements IArcShape {
//     // ...existing code...

//     isArc(): boolean {
//         return this.arcAngles.start !== 0 || this.arcAngles.end !== 360
//     }

//     getArcAngles(): { start: number; end: number } {
//         return this.arcAngles
//     }

//     setArc(start: number, end: number): void {
//         this.arcAngles = { start, end }
//     }

//     // Circle doesn't implement radius or polygon methods
// }
// import { IRadiusable } from '@lib/types/capabilities'

// class Rectangle extends Shape implements IRadiusable {
//     // ...existing code...

//     setBorderRadius(newRadius: number, pos: HandlePos) {
//         // Implementation specific to rectangles
//     }

//     getBorderRadius(): BorderRadius {
//         return this.bdradius
//     }

//     // Rectangle doesn't implement arc or polygon methods
// }
// import { isArcShape, isPolygonal, hasRadius, isRatioAdjustable } from '@lib/utils/shapeCapabilities'

// abstract class SceneNode {
//     // ...existing core methods...

//     // Arc-specific methods
//     getArcAngles(): { start: number; end: number } | null {
//         if (!this.shape || !isArcShape(this.shape)) return null
//         return this.shape.getArcAngles()
//     }

//     isArc(): boolean {
//         if (!this.shape || !isArcShape(this.shape)) return false
//         return this.shape.isArc()
//     }

//     setArc(start: number, end: number): void {
//         if (this.shape && isArcShape(this.shape)) {
//             this.shape.setArc(start, end)
//             this.canComputeMatrix = true
//         }
//     }

//     // Polygon-specific methods
//     getVertexCount(): number | null {
//         if (!this.shape || !isPolygonal(this.shape)) return null
//         return this.shape.getVertexCount()
//     }

//     setVertexCount(count: number): void {
//         if (this.shape && isPolygonal(this.shape)) {
//             this.shape.setVertexCount(count)
//             this.canComputeMatrix = true
//         }
//     }

//     getVertex(prev: number, vertex: number): { x: number; y: number } | null {
//         if (!this.shape || !isPolygonal(this.shape)) return null
//         return this.shape.getVertex(prev, vertex)
//     }

//     // Radius-specific methods
//     setBorderRadius(radius: number, position: HandlePos): void {
//         if (this.shape && hasRadius(this.shape)) {
//             this.shape.setBorderRadius(radius, position)
//             this.canComputeMatrix = true
//         }
//     }

//     // Ratio-specific methods
//     setRatio(ratio: number): void {
//         if (this.shape && isRatioAdjustable(this.shape)) {
//             this.shape.setRatio(ratio)
//             this.canComputeMatrix = true
//         }
//     }

//     // ...existing methods...
// }
// import { IShape } from '@lib/types/shapes'
// import { IArcShape, IPolygonal, IRadiusable, IRatioAdjustable } from '@lib/types/capabilities'

// export function isArcShape(shape: IShape): shape is IShape & IArcShape {
//     return 'isArc' in shape && typeof (shape as any).isArc === 'function'
// }

// export function isPolygonal(shape: IShape): shape is IShape & IPolygonal {
//     return 'getVertexCount' in shape && typeof (shape as any).getVertexCount === 'function'
// }

// export function hasRadius(shape: IShape): shape is IShape & IRadiusable {
//     return 'setBorderRadius' in shape && typeof (shape as any).setBorderRadius === 'function'
// }

// export function isRatioAdjustable(shape: IShape): shape is IShape & IRatioAdjustable {
//     return 'setRatio' in shape && typeof (shape as any).setRatio === 'function'
// }

// export function supportsCapability<T>(shape: IShape, capability: keyof T): shape is IShape & T {
//     return capability in shape && typeof (shape as any)[capability] === 'function'
// }
// import { ITransformable, IModifiable, IResizable, ICollisionDetectable, IRenderable, IConfigurable } from './capabilities'

// export interface IShape extends ITransformable, IModifiable, IResizable, ICollisionDetectable, IRenderable, IConfigurable {
//     // Core required methods
//     getCenterCoord(): Coord
//     drawDefault(): void
//     calculateBoundingRect(): void
//     destroy(): void
// }
// export interface ITransformable {
//     getCoord(): Coord
//     setCoord(x: number, y: number): void
//     moveShape(dx: number, dy: number): void
//     getDim(): Size
//     setDim(width: number, height: number): void
//     getScale(): { x: number; y: number }
//     setScale(x: number, y: number): void
//     getRotationAngle(): number
//     setAngle(angle: number): void
//     getRotationAnchorPoint(): { x: number; y: number }
// }

// export interface IModifiable {
//     getModifierHandles(): Handle[]
//     getModifierHandlesPos(handle: Handle): { x: number; y: number }
// }

// export interface IResizable {
//     setSize(dragStart: Coord, mx: number, my: number, shiftKey: boolean): void
// }

// export interface IRadiusable {
//     setBorderRadius(radius: number, position: HandlePos): void
//     getBorderRadius(): BorderRadius
// }

// export interface IArcShape {
//     isArc(): boolean
//     getArcAngles(): { start: number; end: number }
//     setArc(start: number, end: number): void
// }

// export interface IPolygonal {
//     getVertexCount(): number
//     setVertexCount(count: number): void
//     getVertex(prev: number, vertex: number): { x: number; y: number }
// }

// export interface IRatioAdjustable {
//     setRatio(ratio: number): void
// }

// export interface ICollisionDetectable {
//     pointInShape(x: number, y: number): boolean
//     getRelativeBoundingRect(): BoundingRect
// }

// export interface IRenderable {
//     draw(canvas: Canvas): void
//     setHovered(hovered: boolean): void
// }

// export interface IConfigurable {
//     getProperties(): Properties
//     setProperties(properties: Properties): void
//     getShapeType(): string
// }