import { Canvas, Paint } from 'canvaskit-wasm'
import SceneNode from './Scene'
import type Shape from '@lib/shapes/base/Shape'
import { FlexLayout, LayoutConstraints } from './nodeTypes'
import { applyColumnLayout, applyGridLayout, applyRowLayout } from './LayoutEngine'

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

    getLayoutConstraints() {
        return this.layoutConstraints
    }

    applyLayout(): void {
        if (!this.shape || this.children.length === 0) return

        const { type } = this.layoutConstraints

        switch (type) {
            case 'row':
                applyRowLayout(this.shape, this.children, this.layoutConstraints)
                break
            case 'column':
                applyColumnLayout(this.shape, this.children, this.layoutConstraints)
                break
            case 'grid':
                applyGridLayout(this.shape, this.children, this.layoutConstraints)
                break
            case 'frame':
            default:
                // No layout constraints - children position themselves
                break
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
        strokePaint.setColor(this.resource.canvasKit.Color(220, 150, 255, 1.0))
        strokePaint.setStrokeWidth(1)
        strokePaint.setPathEffect(this.resource.canvasKit.PathEffect.MakeDash([3, 3], 0))

        const rect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, bounds.height)
        canvas.drawRect(rect, strokePaint)

        // Reset path effect
        strokePaint.setPathEffect(null)
        this.drawPaddingAndGap(canvas, bounds)
    }

    private drawPaddingAndGap(canvas: Canvas, bounds: { width: number; height: number }): void {
        const { padding, gap = 0 } = this.layoutConstraints as FlexLayout

        if (!padding) return

        const fillPaint = this.resource.paint

        // Draw padding areas with orange color
        fillPaint.setColor(this.resource.canvasKit.Color(255, 200, 100, 0.3))
        // Top padding
        const topRect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, padding.top)
        canvas.drawRect(topRect, fillPaint)

        // Bottom padding
        const bottomRect = this.resource.canvasKit.XYWHRect(0, bounds.height - padding.bottom, bounds.width, padding.bottom)
        canvas.drawRect(bottomRect, fillPaint)

        // Left padding
        const leftRect = this.resource.canvasKit.XYWHRect(0, padding.top, padding.left, bounds.height - padding.top - padding.bottom)
        canvas.drawRect(leftRect, fillPaint)

        // Right padding
        const rightRect = this.resource.canvasKit.XYWHRect(
            bounds.width - padding.right,
            padding.top,
            padding.right,
            bounds.height - padding.top - padding.bottom
        )
        canvas.drawRect(rightRect, fillPaint)

        // Draw gap indicators with blue color
        if (gap > 0 && this.children.length > 1) {
            fillPaint.setColor(this.resource.canvasKit.Color(100, 200, 255, 0.4))
            this.drawGapAreas(canvas, gap, fillPaint)
        }
    }

    private drawGapAreas(canvas: Canvas, gap: number, fillPaint: Paint): void {
        const { type, padding } = this.layoutConstraints

        for (let i = 0; i < this.children.length - 1; i++) {
            const currentChild = this.children[i]
            const nextChild = this.children[i + 1]

            if (!currentChild.hasShape() || !nextChild.hasShape()) continue

            const currentBounds = currentChild.getDim()
            const currentPos = currentChild.getCoord()
            const container = this.shape.getDim()

            let gapRect: any

            if (type === 'row') {
                // Horizontal gap
                gapRect = this.resource.canvasKit.XYWHRect(
                    currentPos.x + currentBounds.width,
                    currentPos.y,
                    gap,
                    container.height - padding.bottom - padding.top
                )
            } else if (type === 'column') {
                // Vertical gap
                gapRect = this.resource.canvasKit.XYWHRect(currentPos.x, currentPos.y + currentBounds.height, currentBounds.width, gap)
            }

            if (gapRect) {
                canvas.drawRect(gapRect, fillPaint)
            }
        }
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
