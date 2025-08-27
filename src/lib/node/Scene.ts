import CanvasKitResources from '@lib/core/CanvasKitResource'
import { Coord, IShape } from '@lib/types/shapes'
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
        this.localMatrix = this.resource.canvasKit.Matrix.identity()
        this.worldMatrix = this.resource.canvasKit.Matrix.identity()
    }

    setDimension(width: number, height: number): void {
        this.shape.setDim(width, height)

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

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    protected recomputeLocalMatrix(): void {
        if (!this.shape) {
            return
        }
        console.log('called')

        const Matrix = this.resource.canvasKit.Matrix
        const { transform } = this.shape.getProperties()

        const sx = transform.scaleX ?? 1
        const sy = transform.scaleY ?? 1

        const { x: ax, y: ay } = transform.anchorPoint == null ? { x: 0, y: 0 } : transform.anchorPoint

        const T = Matrix.translated(transform.x, transform.y)
        const R = Matrix.rotated(transform.rotation || 0, ax, ay)
        const S = Matrix.scaled(sx, sy, ax, ay)

        this.localMatrix = Matrix.multiply(T, R, S)
    }

    getRelativePosition(x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const { transform } = this.shape.getProperties()
        const tOnly = Matrix.translated(transform.x, transform.y)
        const transformedPoint = Matrix.mapPoints(tOnly, [x, y])
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

    isCollide(x: number, y: number): boolean {
        const { x: tx, y: ty } = this.worldToLocal(x, y)
        return this.shape.pointInShape(tx, ty)
    }

    getShape(): IShape {
        return this.shape
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
