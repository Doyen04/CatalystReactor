import { Canvas } from 'canvaskit-wasm'
// import { IShape } from '@lib/types/shapes'
import SceneNode from './Scene'
import type Shape from '@lib/shapes/base/Shape'
import { LayoutConstraints } from './nodeTypes'

class ContainerNode extends SceneNode {
    children: SceneNode[]
    layoutConstraints: LayoutConstraints

    constructor(shape: Shape | null, layoutConstraints: LayoutConstraints) {
        super()
        this.shape = shape
        this.children = []
        this.parent = null
        this.layoutConstraints = layoutConstraints
        this.setUpMatrix()
    }

    override addChildNode(child: SceneNode): void {
        child.setParent(this)
        this.children.push(child)
        // this.applyLayout()
    }

    override removeChildNode(child: SceneNode): void {
        const i = this.children.indexOf(child)
        if (i !== -1) {
            child.setParent(null)
            this.children.splice(i, 1)
            this.applyLayout()
        }
    }

    setLayoutConstraints(constraints: LayoutConstraints): void {
        this.layoutConstraints = constraints
        this.applyLayout()
    }

    private applyLayout(): void {
        if (!this.shape || this.children.length === 0) return

        const { type, gap = 10, padding = 10, alignment = 'start' } = this.layoutConstraints

        switch (type) {
            case 'row':
                this.applyRowLayout(gap, padding, alignment)
                break
            case 'column':
                this.applyColumnLayout(gap, padding, alignment)
                break
            case 'grid':
                this.applyGridLayout(gap, padding)
                break
            case 'frame':
            default:
                // No layout constraints - children position themselves
                break
        }
    }

    private applyRowLayout(gap: number, padding: number, alignment: string): void {
        let currentX = padding
        const containerBounds = this.shape.getDim()
        const containerHeight = containerBounds.height

        this.children.forEach((child, index) => {
            if (!child.hasShape()) return

            const childBounds = child.getDim()
            let yPos: number

            // Calculate Y position based on alignment
            switch (alignment) {
                case 'center':
                    yPos = (containerHeight - childBounds.height) / 2
                    break
                case 'end':
                    yPos = containerHeight - childBounds.height - padding
                    break
                case 'stretch':
                    yPos = padding
                    child.setDimension(childBounds.width, containerHeight - padding * 2)
                    break
                case 'start':
                default:
                    yPos = padding
                    break
            }

            // Set child position

            console.log(child, 'child', currentX, yPos)
            child.setPosition(currentX, yPos)

            // Move to next position
            currentX += childBounds.width + (index < this.children.length - 1 ? gap : 0)
        })

        // Auto-resize container width if needed
        const totalWidth =
            this.children.reduce((sum, child, index) => {
                if (!child.hasShape()) return sum
                return sum + child.getDim().width + (index > 0 ? gap : 0)
            }, 0) +
            padding * 2

        if (totalWidth > containerBounds.width) {
            this.shape.setDim(totalWidth, containerBounds.height)
        }
    }

    private applyColumnLayout(gap: number, padding: number, alignment: string): void {
        let currentY = padding
        const containerBounds = this.shape.getDim()
        const containerWidth = containerBounds.width

        this.children.forEach((child, index) => {
            if (!child.hasShape()) return

            const childBounds = child.getDim()
            let xPos: number

            // Calculate X position based on alignment
            switch (alignment) {
                case 'center':
                    xPos = (containerWidth - childBounds.width) / 2
                    break
                case 'end':
                    xPos = containerWidth - childBounds.width - padding
                    break
                case 'stretch':
                    xPos = padding
                    child.setDimension(containerWidth - padding * 2, childBounds.height)
                    break
                case 'start':
                default:
                    xPos = padding
                    break
            }

            // Set child position
            child.setPosition(xPos, currentY)

            // Move to next position
            currentY += childBounds.height + (index < this.children.length - 1 ? gap : 0)
        })

        // Auto-resize container height if needed
        const totalHeight =
            this.children.reduce((sum, child, index) => {
                if (!child.hasShape()) return sum
                return sum + child.getDim().height + (index > 0 ? gap : 0)
            }, 0) +
            padding * 2

        if (totalHeight > containerBounds.height) {
            this.shape.setDim(containerBounds.width, totalHeight)
        }
    }

    private applyGridLayout(gap: number, padding: number): void {
        // Simple grid layout - calculate columns based on container width
        const containerBounds = this.shape.getDim()
        const availableWidth = containerBounds.width - padding * 2
        const childWidth = this.children.length > 0 && this.children[0].hasShape() ? this.children[0].getDim().width : 100
        const cols = Math.floor((availableWidth + gap) / (childWidth + gap))

        this.children.forEach((child, index) => {
            if (!child.hasShape()) return

            const row = Math.floor(index / cols)
            const col = index % cols

            const xPos = padding + col * (childWidth + gap)
            const yPos = padding + row * (child.getDim().height + gap)

            child.setPosition(xPos, yPos)
        })
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
        canvas.concat(this.localMatrix)

        if (this.shape) {
            this.shape.draw(canvas)
            this.drawLayoutIndicators(canvas)
            const bounds = this.shape.getDim()
            const clipRect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, bounds.height)
            canvas.clipRect(clipRect, this.resource.canvasKit.ClipOp.Intersect, true)
        }
        this.children.forEach(node => node.draw(canvas))
        canvas.restore()
    }

    private drawLayoutIndicators(canvas: Canvas): void {
        if (!this.resource) return

        const strokePaint = this.resource.strokePaint
        const bounds = this.shape!.getDim()

        // Draw dashed border to indicate container
        strokePaint.setColor(this.resource.canvasKit.Color(100, 150, 255, 0.6))
        strokePaint.setStrokeWidth(1)
        strokePaint.setPathEffect(this.resource.canvasKit.PathEffect.MakeDash([3, 3], 0))

        const rect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, bounds.height)
        canvas.drawRect(rect, strokePaint)

        // Reset path effect
        strokePaint.setPathEffect(null)
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
