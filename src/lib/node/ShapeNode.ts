import { Canvas } from 'canvaskit-wasm'
// import { IShape } from '@lib/types/shapes'
import SceneNode from './Scene'
import type Shape from '@lib/shapes/base/Shape'

class ShapeNode extends SceneNode {
    constructor(shape: Shape | null) {
        super()
        this.shape = shape
        this.parent = null
        this.setUpMatrix()
    }

    override updateWorldMatrix(parentWorld?: number[]) {
        const Matrix = this.resource.canvasKit.Matrix

        const parentMatrix = parentWorld ?? Matrix.identity()

        if (this.canComputeMatrix || (this.shape && this.shape.matrixDirty)) {
            this.recomputeLocalMatrix()
            this.canComputeMatrix = false
            if (this.shape) this.shape.matrixDirty = false
        }

        this.worldMatrix = Matrix.multiply(parentMatrix, this.localMatrix)
    }

    override draw(canvas: Canvas): void {
        canvas.save()
        canvas.concat(this.localMatrix)

        if (this.shape) this.shape.draw(canvas)
        canvas.restore()
    }

    override destroy() {
        if (this.parent) {
            this.parent.removeChildNode(this)
            this.parent = null
        }
        if (this.shape) {
            this.shape.destroy()
            this.shape = null
        }
        this.localMatrix = null
        this.worldMatrix = null
    }
}

export default ShapeNode
