import Tool from './Tool'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import type { ToolContext } from './ToolContext'

type LineState = 'idle' | 'drawing'

class LineTool extends Tool {
    private activeShape: VectorPath | null = null
    private activeNode: SceneNode | null = null
    private state: LineState = 'idle'
    private lastClickTime: number = 0

    constructor(cnvs: HTMLCanvasElement, ctx: ToolContext) {
        super(cnvs, ctx)
        this.handleKeyDown = this.handleKeyDown.bind(this)
    }

    override handlePointerDown(e: MouseEvent) {
        this.isPointerDown = true
        
        // Double click detection to finish
        const now = Date.now()
        if (now - this.lastClickTime < 300 && this.state === 'drawing') {
            this.finishLine()
            this.lastClickTime = 0
            return
        }
        this.lastClickTime = now

        if (this.state === 'idle') {
            let scene = this.ctx.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
            if (!scene) scene = this.ctx.sceneManager.getRootContainer()

            const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

            const shapeNode = this.ctx.sceneManager.addShapeToScene('line', { x: 0, y: 0 }) as ShapeNode
            const shape = shapeNode.shape

            if (shape && shape instanceof VectorPath) {
                this.activeShape = shape

                shapeNode.setPosition(x, y)
                // Force matrix update so worldToLocal works immediately
                shapeNode.updateWorldMatrix(scene.getWorldMatrix() || undefined)

                // Add the FIRST point at origin
                shape.addPoint({ x: 0, y: 0 })
                
                this.ctx.shapeManager.attachNode(shapeNode)
                this.ctx.shapeManager.setSuppressHandles(true)
                this.activeNode = shapeNode
                this.state = 'drawing'
            }
        } else if (this.state === 'drawing' && this.activeShape && this.activeNode) {
            // Successive clicks add more segments
            const { x, y } = this.activeNode.worldToLocal(e.offsetX, e.offsetY)
            
            let endX = x
            let endY = y
            
            if (e.shiftKey) {
                const pts = this.activeShape.points
                const start = pts[pts.length - 1]
                const dx = endX - start.x
                const dy = endY - start.y
                const angle = Math.atan2(dy, dx)
                const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                const dist = Math.sqrt(dx * dx + dy * dy)
                endX = start.x + Math.cos(snapped) * dist
                endY = start.y + Math.sin(snapped) * dist
            }

            this.activeShape.addPoint({ x: endX, y: endY })
            // Force matrix update because addPoint might have triggered recomputeBounds (shifting the origin)
            this.activeNode.updateWorldMatrix(this.activeNode.getParent()?.getWorldMatrix() || undefined)
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (!this.activeShape || !this.activeNode || this.state === 'idle') return

        const { x, y } = this.activeNode.worldToLocal(e.offsetX, e.offsetY)

        let endX = x
        let endY = y

        if (e.shiftKey) {
            const pts = this.activeShape.points
            const start = pts[pts.length - 1]
            const dx = endX - start.x
            const dy = endY - start.y
            const angle = Math.atan2(dy, dx)
            const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
            const dist = Math.sqrt(dx * dx + dy * dy)
            endX = start.x + Math.cos(snapped) * dist
            endY = start.y + Math.sin(snapped) * dist
        }

        // Show preview of the next potential point
        this.activeShape.previewPoint = { x: endX, y: endY }
    }

    override handlePointerUp(_e: MouseEvent): void {
        this.isPointerDown = false
        // Polylines don't finish on Up, they wait for explicit Finish (Enter/Double-click)
    }

    override handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape' || e.key === 'Enter') {
            if (this.activeShape) {
                this.finishLine()
            }
        }
    }

    private finishLine() {
        if (this.activeShape) {
            this.ctx.shapeManager.setSuppressHandles(false)
            this.activeShape.previewPoint = null
            // If only one point, destroy it
            if (this.activeShape.points.length < 2) {
                if (this.activeNode) this.activeNode.destroy()
                this.ctx.shapeManager.detachShape()
            } else {
                this.ctx.shapeManager.finishDrag()
            }
        }
        this.activeShape = null
        this.activeNode = null
        this.state = 'idle'
        
        this.ctx.setTool(this.ctx.defaultTool)
    }

    override toolChange(): void {
        if (this.activeShape && this.state === 'drawing') {
            this.finishLine()
        }
        this.activeShape = null
        this.activeNode = null
        this.state = 'idle'
        super.toolChange()
    }
}

export default LineTool
