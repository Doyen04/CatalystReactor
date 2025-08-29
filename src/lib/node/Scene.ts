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
        this.localMatrix = this.resource.canvasKit.Matrix.identity()
        this.worldMatrix = this.resource.canvasKit.Matrix.identity()
    }

    updateScene(attrib: { position: Coord; dimension: Size }) {
        const { x, y } = this.worldToParentLocal(attrib.position.x, attrib.position.y)
        const { transform } = this.shape.getProperties()

        const { x: ax, y: ay } = transform.anchorPoint == null ? { x: 0, y: 0 } : transform.anchorPoint

        const Matrix = this.resource.canvasKit.Matrix

        const parentTrans = this.parent.worldMatrix
        const oldWorldTrans = this.worldMatrix

        const T = Matrix.translated(attrib.position.x, attrib.position.y)
        const R = Matrix.rotated(0, ax, ay)
        const S = Matrix.scaled(1, 1, ax, ay)
        const Tx = Matrix.multiply(T, R, S)

        const Rx = Matrix.rotated(transform.rotation || 0, ax, ay)

        const inverseParentTrans = Matrix.invert(parentTrans)
        const inverseR = Matrix.invert(Rx)

        const newLocaltrans = Matrix.multiply(inverseR, inverseParentTrans, Tx)

        console.log(newLocaltrans, 'newlocaltrans', x, y, transform.rotation, R, S, Tx, Rx)
        console.log(inverseParentTrans, 'parenttrans-inverse')
        console.log(oldWorldTrans, 'oldlocaltrans')

        // this.setFlip(attrib.flip.x, attrib.flip.y)

        this.setPosition(attrib.position.x, attrib.position.y)

        this.setDimension(Math.abs(attrib.dimension.width), Math.abs(attrib.dimension.height))
    }

    getRadianQuadrant(theta) {
        const twoPi = 2 * Math.PI
        let angle = theta % twoPi
        if (angle < 0) angle += twoPi

        if (angle < Math.PI / 2) return 'Quadrant I' // 0 to π/2
        else if (angle < Math.PI) return 'Quadrant II' // π/2 to π
        else if (angle < (3 * Math.PI) / 2) return 'Quadrant III' // π to 3π/2
        else return 'Quadrant IV' // 3π/2 to 2π
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

    decompose(matrix: number[]) {
        const [a, c, tx, b, d, ty, persp0, persp1, persp2] = matrix

        // Translation is straightforward
        const translation = { x: tx, y: ty }

        // Calculate scale magnitudes
        const scaleX = Math.sqrt(a * a + b * b)
        const scaleY = Math.sqrt(c * c + d * d)

        // Determine if there's a reflection (negative determinant)
        const determinant = a * d - b * c
        const actualScaleY = determinant < 0 ? -scaleY : scaleY

        // Calculate rotation from the first column vector
        const rotation = Math.atan2(b, a)

        // Normalize by scale to isolate skew
        const normalizedA = a / scaleX
        const normalizedB = b / scaleX
        const normalizedC = c / actualScaleY
        const normalizedD = d / actualScaleY

        // Calculate skew angle
        const skewX =
            Math.atan2(normalizedA * normalizedC + normalizedB * normalizedD, normalizedA * normalizedA + normalizedB * normalizedB) - rotation

        return {
            translation,
            rotation,
            scale: { x: scaleX, y: actualScaleY },
            skew: { x: skewX, y: 0 }, // 2D transforms typically don't have Y skew
            matrix: matrix.slice(),
        }
    }

    getTransform(matrix: number[]) {
        const Matrix = this.resource.canvasKit.Matrix
        const tOnly = this.decompose(matrix)
        return Matrix.translated(tOnly.translation.x, tOnly.translation.y)
    }

    getAbsolutePosition(dx?: number, dy?: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const transformedPoint = Matrix.mapPoints(this.worldMatrix, [dx || 0, dy || 0])
        return {
            x: transformedPoint[0],
            y: transformedPoint[1],
        }
    }

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    protected recomputeLocalMatrix(): void {
        if (!this.shape) {
            return
        }

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

    getAngle(): number {
        const { rotation } = this.shape.getProperties().transform
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

    getBoundingAbsoluteRect() {
        const { width, height } = this.shape.getDim()

        // Transform from local coordinates to parent coordinates
        const parentCorners = this.getAbsolutePosition()

        return {
            left: parentCorners.x,
            top: parentCorners.y,
            right: parentCorners.x + width,
            bottom: parentCorners.y + height,
        }
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
