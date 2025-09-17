import CanvasKitResources from '@lib/core/CanvasKitResource'
import Handle from '@lib/modifiers/Handles'
import type Shape from '@lib/shapes/base/Shape'
import Oval from '@lib/shapes/primitives/Oval'
import Polygon from '@lib/shapes/primitives/Polygon'
import PText from '@lib/shapes/primitives/PText'
import Rectangle from '@lib/shapes/primitives/Rect'
import Star from '@lib/shapes/primitives/Star'
import { BoundingRect, Coord, HandlePos, Properties, Size } from '@lib/types/shapes'
import { Canvas } from 'canvaskit-wasm'

abstract class SceneNode {
    public zIndex: number = 0
    protected shape: Shape
    protected parent: SceneNode | null
    protected localMatrix: number[] | null
    protected worldMatrix: number[] | null
    protected canComputeMatrix: boolean = false

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }

    setUpMatrix() {
        const Matrix = this.resource.canvasKit.Matrix
        this.localMatrix = Matrix.identity()
        this.worldMatrix = Matrix.identity()
    }

    updateScene(attrib: { position: Coord; scale: Coord; dimension: Size }) {
        this.setPosition(Math.floor(attrib.position.x), Math.floor(attrib.position.y))
        this.setScale(attrib.scale.x, attrib.scale.y)
        this.setDimension(Math.floor(Math.abs(attrib.dimension.width)), Math.floor(Math.abs(attrib.dimension.height)))
    }

    setDimension(width: number, height: number): void {
        this.shape.setDim(width, height)

        this.canComputeMatrix = true
    }

    setScale(x: number, y: number): void {
        this.shape.setScale(x, y)

        this.canComputeMatrix = true
    }

    setAngle(angle: number): void {
        this.shape.setAngle(angle)

        this.canComputeMatrix = true
    }

    setPosition(x: number, y: number): void {
        this.shape.setCoord(x, y)

        this.canComputeMatrix = true
    }

    move(dx: number, dy: number): void {
        this.shape.moveShape(dx, dy)

        this.canComputeMatrix = true
    }

    setParent(parent: SceneNode) {
        this.parent = parent
    }

    drawOnDrag(dragStart: Coord, e: MouseEvent) {
        const { x: dx, y: dy } = this.worldToParentLocal(dragStart.x, dragStart.y)
        const { x: tx, y: ty } = this.worldToParentLocal(e.offsetX, e.offsetY)

        this.shape.setSize({ x: dx, y: dy }, tx, ty, e.shiftKey)

        this.canComputeMatrix = true
    }

    drawDefault() {
        this.shape.drawDefault()

        this.canComputeMatrix = true
    }

    localToWorld(dx: number, dy: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const transformedPoint = Matrix.mapPoints(this.worldMatrix, [dx, dy])
        return {
            x: transformedPoint[0],
            y: transformedPoint[1],
        }
    }

    worldToParentLocal(x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const inverseMatrix = Matrix.invert(this.parent.worldMatrix)
        const transformedPoint = Matrix.mapPoints(inverseMatrix, [x, y])
        return {
            x: transformedPoint[0],
            y: transformedPoint[1],
        }
    }

    worldToLocal(x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const inverseMatrix = Matrix.invert(this.worldMatrix)

        const transformedPoint = Matrix.mapPoints(inverseMatrix, [x, y])
        return {
            x: transformedPoint[0],
            y: transformedPoint[1],
        }
    }

    buildZeroTransform(width: number, height: number, rotation: number, scale: { x: number; y: number }, rotationAnchor: { x: number; y: number }) {
        const Matrix = this.resource.canvasKit.Matrix

        const anchorX = width * (rotationAnchor?.x ?? 0.5)
        const anchorY = height * (rotationAnchor?.y ?? 0.5)

        const R = Matrix.rotated(rotation || 0, anchorX, anchorY)
        const S = Matrix.scaled(scale?.x ?? 1, scale?.y ?? 1, anchorX, anchorY)

        return Matrix.multiply(R, S)
    }

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    protected recomputeLocalMatrix(): void {
        if (!this.shape) {
            return
        }

        const Matrix = this.resource.canvasKit.Matrix

        const { x, y } = this.shape.getCoord()

        const { width, height } = this.shape.getDim()
        const rotation = this.shape.getRotationAngle()
        const { x: sx, y: sy } = this.shape.getScale()
        const anchor = this.shape.getRotationAnchorPoint()
        const offsetX = anchor.x * width
        const offsetY = anchor.y * height

        const T = Matrix.translated(x, y)
        const R = Matrix.rotated(rotation || 0, offsetX, offsetY)
        const S = Matrix.scaled(sx, sy, offsetX, offsetY)

        this.localMatrix = Matrix.multiply(T, R, S)
    }

    isCollide(x: number, y: number): boolean {
        const { x: tx, y: ty } = this.worldToLocal(x, y)

        return this.shape.pointInShape(tx, ty)
    }

    setZIndex(zIndex: number): void {
        this.zIndex = zIndex
        // Trigger re-render if needed
    }

    getZIndex(): number {
        return this.zIndex
    }

    getAbsoluteBoundingRect(): BoundingRect {
        if (!this.shape) {
            return null
        }

        const { width, height } = this.shape.getDim()

        const corners = [
            [0, 0],
            [width, 0],
            [0, height],
            [width, height],
        ]

        const transformedCorners = corners.map(pt => this.localToWorld(pt[0], pt[1]))

        const xs = transformedCorners.map(p => p.x)
        const ys = transformedCorners.map(p => p.y)

        const left = Math.min(...xs)
        const right = Math.max(...xs)
        const top = Math.min(...ys)
        const bottom = Math.max(...ys)

        return { left, top, right, bottom }
    }

    getAngle(): number {
        const rotation = this.shape.getRotationAngle()
        return rotation || 0
    }

    getParent(): SceneNode | null {
        return this.parent
    }

    getLocalMatrix(): number[] | null {
        return this.localMatrix
    }

    getWorldMatrix(): number[] | null {
        return this.worldMatrix
    }

    getDim(): { width: number; height: number } | null {
        return this.shape ? this.shape.getDim() : null
    }

    getProperties(): Properties | null {
        return this.shape ? this.shape.getProperties() : null
    }

    getCoord(): Coord | null {
        return this.shape ? this.shape.getCoord() : null
    }

    getModifierHandlesPos(handle: Handle): { x: number; y: number } | null {
        if (!this.shape) return null

        return this.shape.getModifierHandlesPos(handle)
    }

    getScale(): { x: number; y: number } | null {
        return this.shape ? this.shape.getScale() : null
    }

    getRotationAngle(): number | null {
        return this.shape ? this.shape.getRotationAngle() : null
    }

    getRotationAnchorPoint(): { x: number; y: number } | null {
        return this.shape ? this.shape.getRotationAnchorPoint() : null
    }

    getModifierHandles(): Handle[] | null {
        return this.shape ? this.shape.getModifierHandles() : null
    }

    getRelativeBoundingRect(): BoundingRect | null {
        if (!this.shape) return null

        return this.shape.getRelativeBoundingRect()
    }

    getCenterCoord(): { x: number; y: number } | null {
        if (!this.shape) return null

        return this.shape.getCenterCoord()
    }

    getArcAngles(): { start: number; end: number } | null {
        if (!this.shape) return null
        if (this.shape instanceof Oval) {
            return this.shape.getArcAngles()
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    getVertexCount(): number | null {
        if (!this.shape) return null
        if (this.shape instanceof Star || this.shape instanceof Polygon) {
            return this.shape.getVertexCount()
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    getShapeType(): string | null {
        if (!this.shape) return null

        return this.shape.getShapeType()
    }

    getVertex(prev: number, vertex: number): { x: number; y: number } | null {
        if (!this.shape) return null
        if (this.shape instanceof Star || this.shape instanceof Polygon) {
            return this.shape.getVertex(prev, vertex)
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    isArc(): boolean {
        if (!this.shape) return false
        if (this.shape instanceof Oval) {
            return this.shape.isArc()
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    setVertexCount(count: number): void {
        if (this.shape instanceof Star || this.shape instanceof Polygon) {
            return this.shape.setVertexCount(count)
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    setArc(start: number, end: number): void {
        if (this.shape instanceof Oval) {
            return this.shape.setArc(start, end)
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    setRatio(ratio: number): void {
        if (this.shape instanceof Oval) {
            return this.shape.setRatio(ratio)
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    setBorderRadius(radius: number, position: HandlePos): void {
        if (this.shape instanceof Star || this.shape instanceof Polygon || this.shape instanceof Rectangle) {
            return this.shape.setBorderRadius(radius, position)
        } else {
            return null
            // throw new Error('not implemented')
        }
    }

    setProperties(properties: Properties): void {
        if (this.shape) {
            this.shape.setProperties(properties)
        }
    }

    hasShape(): boolean {
        return this.shape != null
    }

    setLocalMatrix(matrix: number[]) {
        this.localMatrix = matrix
    }

    setHovered(hovered: boolean): void {
        if (this.shape) {
            this.shape.setHovered(hovered)
        }
    }

    removeChildNode(child: SceneNode): void {
        console.log('implement removeChildNode', child)
        // Implementation for removing a child node
    }

    addChildNode(child: SceneNode): void {
        console.log('implement addChildNode', child)
        // Implementation for adding a child node
    }

    checkCrossing(prev: number, curr: number) {
        if (this.shape instanceof Oval) {
            return this.shape.checkCrossing(prev, curr)
        }
    }

    toDegree(rad: number) {
        if (this.shape instanceof Oval) {
            return this.shape.toDegree(rad)
        }
    }

    canEdit() {
        return this.shape && this.shape instanceof PText
    }

    insertText(char: string, shiftKey: boolean) {
        if (this.shape instanceof PText) {
            this.shape.insertText(char, shiftKey)
        }
    }
    deleteText(direc: 'forward' | 'backward') {
        if (this.shape instanceof PText) {
            this.shape.deleteText(direc)
        }
    }
    moveCursor(direc: 'right' | 'left' | 'up' | 'down', shiftKey: boolean) {
        if (this.shape instanceof PText) {
            this.shape.moveCursor(direc, shiftKey)
        }
        console.log(direc, shiftKey)
    }

    cleanUp() {
        this.shape.cleanUp()
    }
    abstract draw(ctx: Canvas): void
    abstract updateWorldMatrix(matrix?: number[]): void
    abstract destroy(): void
}

export default SceneNode
