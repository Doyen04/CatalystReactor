import { Canvas } from 'canvaskit-wasm'
import { IShape } from '@lib/types/shapes'
import SceneNode from './Scene'

class ShapeNode extends SceneNode {
    constructor(shape: IShape | null) {
        super()
        this.shape = shape
        this.parent = null
        this.setUpMatrix()
    }

    override updateWorldMatrix(parentWorld?: number[]) {
        const Matrix = this.resource.canvasKit.Matrix

        const parentMatrix = parentWorld ?? Matrix.identity()

        this.recomputeLocalMatrix()

        this.worldMatrix = Matrix.multiply(parentMatrix, this.localMatrix)
    }

    override draw(canvas: Canvas): void {
        canvas.save()
        canvas.concat(this.localMatrix)

        if (this.shape) this.shape.draw(canvas)
        canvas.restore()
    }

    override destroy() {
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
