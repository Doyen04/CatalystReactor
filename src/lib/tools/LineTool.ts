import Tool from './Tool'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'
import VectorPath from '@lib/shapes/primitives/VectorPath'

class LineTool extends Tool {
    private activeShape: VectorPath | null = null

    constructor(cnvs: HTMLCanvasElement) {
        super(cnvs)
    }

    override handlePointerDown(e: MouseEvent) {
        super.handlePointerDown(e)

        let scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        if (!scene) scene = this.sceneManager.getRootContainer()

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const shape = ShapeFactory.createShape('line', { x: 0, y: 0 })

        if (shape && shape instanceof VectorPath) {
            this.activeShape = shape

            // Add two points at the same location — the second will follow the mouse
            shape.addPoint({ x, y })
            shape.addPoint({ x, y })

            const shapeNode: SceneNode = new ShapeNode(shape)
            scene.addChildNode(shapeNode)
            this.shapeManager.attachNode(shapeNode)
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (this.isPointerDown && this.activeShape) {
            this.isDragging = true
            let scene = this.shapeManager.currentScene
            if (!scene) return

            const parent = scene.getParent()
            const { x, y } = parent
                ? parent.worldToLocal(e.offsetX, e.offsetY)
                : { x: e.offsetX, y: e.offsetY }

            let endX = x
            let endY = y

            // Shift key constrains to 45° angles
            if (e.shiftKey) {
                const start = this.activeShape.points[0]
                const dx = endX - start.x
                const dy = endY - start.y
                const angle = Math.atan2(dy, dx)
                const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                const dist = Math.sqrt(dx * dx + dy * dy)
                endX = start.x + Math.cos(snapped) * dist
                endY = start.y + Math.sin(snapped) * dist
            }

            this.activeShape.updateLastPoint(endX, endY)
        }
    }

    override handlePointerUp(e: MouseEvent): void {
        if (this.activeShape) {
            // Check if the line is too short
            const pts = this.activeShape.points
            if (pts.length === 2) {
                const dx = pts[1].x - pts[0].x
                const dy = pts[1].y - pts[0].y
                if (Math.sqrt(dx * dx + dy * dy) < 5) {
                    // Make a default-sized line
                    pts[1].x = pts[0].x + 100
                    pts[1].y = pts[0].y
                }
            }
        }
        this.activeShape = null

        if (this.isDragging) {
            this.shapeManager.finishDrag()
        }
        super.handlePointerUp(e)
    }
}

export default LineTool
