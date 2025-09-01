import CanvasKitResources from '@lib/core/CanvasKitResource'
import { Coord, IShape, Size } from '@lib/types/shapes'
import { Canvas } from 'canvaskit-wasm'

abstract class SceneNode {
    protected shape: IShape
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
        this.setPosition(attrib.position.x, attrib.position.y)
        this.setScale(attrib.scale.x, attrib.scale.y)
        this.setDimension(Math.abs(attrib.dimension.width), Math.abs(attrib.dimension.height))
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

    setFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        this.shape.handleFlip(isFlippedX, isFlippedY)

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

    toZeroTransform(zeroTransform: number[], x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const transformedPoint = Matrix.mapPoints(zeroTransform, [x, y])
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

    getShape(): IShape {
        return this.shape
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

    hasShape(): boolean {
        return this.shape != null
    }

    setLocalMatrix(matrix: number[]) {
        this.localMatrix = matrix
    }

    removeChildNode(child: SceneNode): void {
        console.log('implement removeChildNode', child)
        // Implementation for removing a child node
    }

    addChildNode(child: SceneNode): void {
        console.log('implement addChildNode', child)
        // Implementation for adding a child node
    }

    abstract draw(ctx: Canvas): void
    abstract updateWorldMatrix(matrix?: number[]): void
    abstract destroy(): void
}

export default SceneNode
