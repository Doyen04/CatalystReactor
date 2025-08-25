import { Canvas } from 'canvaskit-wasm'
import { Coord, IShape } from '@lib/types/shapes'
import CanvasKitResources from '../core/CanvasKitResource'
import SceneNode from './Scene'
import transformWorldToLocal from '@lib/helper/worldToLocal'

class ShapeNode implements SceneNode {
    shape: IShape | null
    parent: SceneNode | null
    localMatrix: number[] | null
    worldMatrix: number[] | null

    constructor(shape: IShape | null) {
        this.shape = shape
        this.parent = null

        this.setUpMatrix()
    }

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

    drawOnDrag(dragStart: Coord, e: MouseEvent) {
        const Matrix = this.resource.canvasKit.Matrix
        const { x: dx, y: dy } = transformWorldToLocal(Matrix, Matrix.invert(this.parent.worldMatrix), dragStart)
        const { x: tx, y: ty } = transformWorldToLocal(Matrix, Matrix.invert(this.parent.worldMatrix), { x: e.offsetX, y: e.offsetY })

        this.shape.setSize({ x: dx, y: dy }, tx, ty, e.shiftKey)

        this.updateWorldMatrix()
    }

    drawDefault() {
        this.shape.drawDefault()

        this.updateWorldMatrix()
    }

    setDimension(width: number, height: number): void {
        this.shape.setDim(width, height)

        this.updateWorldMatrix()
    }

    setAngle(angle: number): void {
        this.shape.setAngle(angle)
    }

    setFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        this.shape.handleFlip(isFlippedX, isFlippedY)

        this.updateWorldMatrix()
    }

    setPosition(x: number, y: number): void {
        this.shape.setCoord(x, y)

        this.updateWorldMatrix()
    }

    setParent(parent: SceneNode): void {
        this.parent = parent

        this.updateWorldMatrix()
    }

    move(dx: number, dy: number): void {
        this.shape.moveShape(dx, dy)

        this.updateWorldMatrix()
    }

    isCollide(x: number, y: number): boolean {
         const Matrix = this.resource.canvasKit.Matrix
         const { x: tx, y: ty } = transformWorldToLocal(Matrix, Matrix.invert(this.parent.worldMatrix), { x, y })

        return this.shape.pointInShape(tx, ty)
    }

    getShape(): IShape {
        return this.shape
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

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    private recomputeLocalMatrix(): void {
        if (!this.shape) {
            return
        }
        const Matrix = this.resource.canvasKit.Matrix
        const { transform } = this.shape.getProperties()

        const sx = transform.scaleX ?? 1
        const sy = transform.scaleY ?? 1

        const { x: ax, y: ay } = !transform.anchorPoint
            ? { x: 0, y: 0 }
            : {
                  x: transform.anchorPoint.x - transform.x,
                  y: transform.anchorPoint.y - transform.y,
              }

        const T = Matrix.translated(transform.x, transform.y)
        const R = Matrix.rotated(transform.rotation || 0, ax, ay)
        const S = Matrix.scaled(sx, sy, ax, ay)

        this.localMatrix = Matrix.multiply(T, R, S)
    }

    updateWorldMatrix(parentWorld?: number[]) {
        const Matrix = this.resource.canvasKit.Matrix

        const parentMatrix = parentWorld ?? Matrix.identity()

        this.recomputeLocalMatrix()

        this.worldMatrix = Matrix.multiply(parentMatrix, this.localMatrix)
        
    }

    draw(canvas: Canvas): void {
        canvas.save()
        canvas.concat(this.localMatrix)

        if (this.shape) this.shape.draw(canvas)
        canvas.restore()
    }

    destroy() {
        if (this.shape) {
            this.shape.destroy()
            this.shape = null
        }
        if (this.parent) {
            this.parent.destroy()
            this.parent = null
        }
        this.localMatrix = null
        this.worldMatrix = null
    }
}

export default ShapeNode
