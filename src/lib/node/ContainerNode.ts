import { Canvas, Paint, Rect } from 'canvaskit-wasm'
import SceneNode from './Scene'
import type Shape from '@lib/shapes/base/Shape'
import { FlexLayout, GridLayout, LayoutConstraints } from './nodeTypes'
import { applyColumnLayout, applyGridLayout, applyRowLayout } from './LayoutEngine'
import PaintManager from '@lib/core/PaintManager'
import container from '@lib/core/DependencyManager'

class ContainerNode extends SceneNode {
    children: SceneNode[]
    layoutConstraints: LayoutConstraints
    paintManager: PaintManager

    constructor(shape: Shape | null, layoutConstraints: LayoutConstraints) {
        super()
        this.shape = shape
        this.children = []
        this.paintManager = container.resolve<PaintManager>('paintManager')
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
            this.drawPaddingAndGap(canvas)
            const bounds = this.shape.getDim()
            const clipRect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, bounds.height)
            canvas.clipRect(clipRect, this.resource.canvasKit.ClipOp.Intersect, true)
        }
        this.children.forEach(node => node.draw(canvas))
        canvas.restore()
    }

    private drawPaddingAndGap(canvas: Canvas): void {
        const { padding } = this.layoutConstraints

        if (!padding) return
        const bounds = this.shape.getDim()

        const fillPaint = this.paintManager.paint

        // Draw padding areas with orange color
        fillPaint.setColor(this.resource.canvasKit.Color(255, 200, 100, 0.3))

        // Top padding
        if (padding.top > 0) {
            const topRect = this.resource.canvasKit.XYWHRect(0, 0, bounds.width, padding.top)
            canvas.drawRect(topRect, fillPaint)
        }

        // Bottom padding
        if (padding.bottom > 0) {
            const bottomRect = this.resource.canvasKit.XYWHRect(0, bounds.height - padding.bottom, bounds.width, padding.bottom)
            canvas.drawRect(bottomRect, fillPaint)
        }

        // Left padding
        if (padding.left > 0) {
            const leftRect = this.resource.canvasKit.XYWHRect(0, padding.top, padding.left, bounds.height - padding.top - padding.bottom)
            canvas.drawRect(leftRect, fillPaint)
        }

        // Right padding
        if (padding.right > 0) {
            const rightRect = this.resource.canvasKit.XYWHRect(
                bounds.width - padding.right,
                padding.top,
                padding.right,
                bounds.height - padding.top - padding.bottom
            )
            canvas.drawRect(rightRect, fillPaint)
        }

        // Draw gap indicators based on layout type
        this.drawGapIndicators(canvas, bounds, fillPaint)
    }

    private drawGapIndicators(canvas: Canvas, bounds: { width: number; height: number }, fillPaint: Paint): void {
        const { type } = this.layoutConstraints

        if (this.children.length <= 1) return

        // Set gap color to blue
        fillPaint.setColor(this.resource.canvasKit.Color(100, 200, 255, 0.4))

        switch (type) {
            case 'row':
            case 'column':
                this.drawFlexGaps(canvas, fillPaint)
                break
            case 'grid':
                this.drawGridGaps(canvas, bounds, fillPaint)
                break
            default:
                break
        }
    }

    private drawFlexGaps(canvas: Canvas, fillPaint: Paint): void {
        const { type, gap = 0, padding } = this.layoutConstraints as FlexLayout

        if (gap <= 0) return

        const containerBounds = this.shape.getDim()
        const paddingLeft = padding?.left || 0
        const paddingRight = padding?.right || 0
        const paddingTop = padding?.top || 0
        const paddingBottom = padding?.bottom || 0

        for (let i = 0; i < this.children.length - 1; i++) {
            const currentChild = this.children[i]
            const nextChild = this.children[i + 1]

            if (!currentChild.hasShape() || !nextChild.hasShape()) continue

            const currentBounds = currentChild.getDim()
            const currentPos = currentChild.getCoord()
            const nextPos = nextChild.getCoord()

            let gapRect: Rect

            if (type === 'row') {
                // Horizontal gap between children - spans full height of container content area
                const gapX = currentPos.x + currentBounds.width
                const gapWidth = nextPos.x - gapX
                const gapY = paddingTop
                const gapHeight = containerBounds.height - paddingTop - paddingBottom

                gapRect = this.resource.canvasKit.XYWHRect(gapX, gapY, gapWidth, gapHeight)
            } else if (type === 'column') {
                // Vertical gap between children - spans full width of container content area
                const gapY = currentPos.y + currentBounds.height
                const gapHeight = nextPos.y - gapY
                const gapX = paddingLeft
                const gapWidth = containerBounds.width - paddingLeft - paddingRight

                gapRect = this.resource.canvasKit.XYWHRect(gapX, gapY, gapWidth, gapHeight)
            }

            if (gapRect) {
                canvas.drawRect(gapRect, fillPaint)
            }
        }
    }

    private drawGridGaps(canvas: Canvas, bounds: { width: number; height: number }, fillPaint: Paint): void {
        const { gridRowGap = 0, gridColumnGap = 0, padding } = this.layoutConstraints as GridLayout

        if (gridRowGap <= 0 && gridColumnGap <= 0) return

        // Calculate grid dimensions (similar to layout engine logic)
        const availableWidth = bounds.width - (padding?.left || 0) - (padding?.right || 0)
        const availableHeight = bounds.height - (padding?.top || 0) - (padding?.bottom || 0)

        const columns = Math.ceil(Math.sqrt(this.children.length))
        const rows = Math.ceil(this.children.length / columns)

        const cellWidth = (availableWidth - (columns - 1) * gridColumnGap) / columns
        const cellHeight = (availableHeight - (rows - 1) * gridRowGap) / rows

        // Draw column gaps (vertical lines)
        if (gridColumnGap > 0) {
            for (let col = 0; col < columns - 1; col++) {
                const x = (padding?.left || 0) + (col + 1) * cellWidth + col * gridColumnGap
                const gapRect = this.resource.canvasKit.XYWHRect(x, padding?.top || 0, gridColumnGap, availableHeight)
                canvas.drawRect(gapRect, fillPaint)
            }
        }

        // Draw row gaps (horizontal lines)
        if (gridRowGap > 0) {
            for (let row = 0; row < rows - 1; row++) {
                const y = (padding?.top || 0) + (row + 1) * cellHeight + row * gridRowGap
                const gapRect = this.resource.canvasKit.XYWHRect(padding?.left || 0, y, availableWidth, gridRowGap)
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
