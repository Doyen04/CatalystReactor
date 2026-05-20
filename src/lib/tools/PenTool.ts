import Tool from './Tool'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import { useToolStore } from '@hooks/useTool'

type PenState = 'idle' | 'placing' | 'dragging-handle'

class PenTool extends Tool {
    private activeShape: VectorPath | null = null
    private activeNode: SceneNode | null = null
    private state: PenState = 'idle'
    private lastDownPos: { x: number; y: number } | null = null
    private parentScene: SceneNode | null = null

    constructor(cnvs: HTMLCanvasElement) {
        super(cnvs)
        this.handleKeyDown = this.handleKeyDown.bind(this)
    }

    override handlePointerDown(e: MouseEvent): void {
        this.isPointerDown = true
        this.isDragging = false
        this.lastDownPos = { x: e.offsetX, y: e.offsetY }

        if (this.state === 'idle') {
            // Start a new path
            let scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
            if (!scene) scene = this.sceneManager.getRootContainer()
            this.parentScene = scene

            const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

            const shape = ShapeFactory.createShape('path', { x: 0, y: 0 })
            if (shape && shape instanceof VectorPath) {
                this.activeShape = shape

                const shapeNode: SceneNode = new ShapeNode(shape)
                scene.addChildNode(shapeNode)
                shapeNode.setPosition(x, y)
                shape.addPoint({ x: 0, y: 0 })

                this.shapeManager.attachNode(shapeNode)
                this.activeNode = shapeNode

                this.state = 'placing'
            }
        } else if (this.state === 'placing' && this.activeShape) {
            const { x, y } = this.activeNode
                ? this.activeNode.worldToLocal(e.offsetX, e.offsetY)
                : { x: e.offsetX, y: e.offsetY }

            // Check if clicking near the first point to close the path
            const firstPt = this.activeShape.points[0]
            const dx = x - firstPt.x
            const dy = y - firstPt.y
            if (this.activeShape.points.length > 2 && Math.sqrt(dx * dx + dy * dy) < 12) {
                this.activeShape.closed = true
                this.activeShape.previewPoint = null
                this.finishPath()
                return
            }

            // Add a new point
            this.activeShape.addPoint({ x, y })
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (!this.activeShape || this.state === 'idle') return

        const { x, y } = this.activeNode
            ? this.activeNode.worldToLocal(e.offsetX, e.offsetY)
            : { x: e.offsetX, y: e.offsetY }

        if (this.isPointerDown && this.lastDownPos) {
            // Dragging after clicking — create Bézier handles
            const dx = e.offsetX - this.lastDownPos.x
            const dy = e.offsetY - this.lastDownPos.y
            if (Math.sqrt(dx * dx + dy * dy) > 3) {
                this.isDragging = true
                this.state = 'dragging-handle'

                const pts = this.activeShape.points
                const lastPt = pts[pts.length - 1]

                // Symmetric handles: cp2 follows mouse, cp1 mirrors
                lastPt.cp2 = { x, y }
                lastPt.cp1 = {
                    x: lastPt.x - (x - lastPt.x),
                    y: lastPt.y - (y - lastPt.y),
                }
                lastPt.smooth = true
            }
        } else {
            // Just hovering — update preview line
            this.activeShape.previewPoint = { x, y }
        }
    }

    override handlePointerUp(e: MouseEvent): void {
        this.isPointerDown = false

        if (this.state === 'dragging-handle') {
            this.state = 'placing'
        }

        this.lastDownPos = null
        // Don't call super — we don't want to switch to select tool yet
    }

    override handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape' || e.key === 'Enter') {
            if (this.activeShape) {
                this.activeShape.previewPoint = null
                this.finishPath()
            }
        }
    }

    private finishPath(): void {
        if (this.activeShape) {
            // If only one point, remove the path
            if (this.activeShape.points.length < 2) {
                if (this.activeNode) {
                    this.activeNode.destroy()
                }
                this.shapeManager.detachShape()
            } else {
                this.shapeManager.finishDrag()
            }
        }
        this.activeShape = null
        this.activeNode = null
        this.parentScene = null
        this.state = 'idle'

        const { setDefaultTool } = useToolStore.getState()
        setDefaultTool()
    }

    override toolChange(): void {
        // If we're in the middle of placing points, finish the path
        if (this.activeShape && this.state !== 'idle') {
            this.activeShape.previewPoint = null
            if (this.activeShape.points.length >= 2) {
                this.shapeManager.finishDrag()
            }
        }
        this.activeShape = null
        this.activeNode = null
        this.parentScene = null
        this.state = 'idle'
        super.toolChange()
    }
}

export default PenTool
