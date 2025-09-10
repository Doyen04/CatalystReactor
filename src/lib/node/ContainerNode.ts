import { Canvas } from 'canvaskit-wasm'
// import { IShape } from '@lib/types/shapes'
import SceneNode from './Scene'
import type Shape from '@lib/shapes/base/Shape'

class ContainerNode extends SceneNode {
    children: SceneNode[]

    constructor(shape: Shape | null) {
        super()
        this.shape = shape
        this.children = []
        this.parent = null
        this.setUpMatrix()
    }

    override addChildNode(child: SceneNode): void {
        child.setParent(this)
        this.children.push(child)
    }

    override removeChildNode(child: SceneNode): void {
        const i = this.children.indexOf(child)
        if (i !== -1) {
            child.setParent(null)
            this.children.splice(i, 1)
        }
    }

    override updateWorldMatrix(parentWorld?: number[]) {
        const Matrix = this.resource.canvasKit.Matrix

        const parentMatrix = parentWorld ?? Matrix.identity()

        if (this.canComputeMatrix) {
            this.recomputeLocalMatrix()
            this.canComputeMatrix = false
        }

        this.worldMatrix = Matrix.multiply(parentMatrix, this.localMatrix)

        for (const c of this.children) {
            c.updateWorldMatrix(this.worldMatrix)
        }
    }

    override draw(canvas: Canvas): void {
        canvas.save()
        canvas.concat(this.worldMatrix)

        if (this.shape) this.shape.draw(canvas)
        this.children.forEach(node => node.draw(canvas))
        canvas.restore()
    }

    destroy() {
        if (this.shape) {
            this.parent?.removeChildNode(this)
            this.shape.destroy()
            this.shape = null
        }
        if (this.children.length > 0) {
            this.children.forEach(child => {
                const parent = child.getParent()
                parent?.removeChildNode(child)
                child.destroy()
            })
            this.children = []
        }
        if (this.parent) {
            this.parent.destroy()
            this.parent = null
        }
        this.localMatrix = null
        this.worldMatrix = null
    }
}

export default ContainerNode
