import { ShapeType } from '@lib/types/shapes'
import Tool from './Tool'
import ShapeNode from '@lib/node/ShapeNode'
import type { ToolContext } from './ToolContext'

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType, cnvs: HTMLCanvasElement, ctx: ToolContext) {
        super(cnvs, ctx)
        this.shapeType = shape
    }

    override handlePointerDown(e: MouseEvent) {
        super.handlePointerDown(e)
        let scene = this.ctx.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        if (!scene) scene = this.ctx.sceneManager.getRootContainer()

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const shapeNode = this.ctx.sceneManager.addShapeToScene(this.shapeType, {
            x: x,
            y: y,
        }) as ShapeNode

        if (shapeNode) {
            this.ctx.shapeManager.attachNode(shapeNode)
        }
    }
    override handlePointerMove(e: MouseEvent): void {
        if (this.isPointerDown) {
            this.handlePointerDrag(e)
        }
    }
    override handlePointerUp(e: MouseEvent): void {
        this.ctx.shapeManager.handleTinyShapes()
        if (this.isDragging) {
            this.ctx.shapeManager.finishDrag()
        }
        super.handlePointerUp?.(e)
    }

    handlePointerDrag(e: MouseEvent): void {
        this.isDragging = true
        if (this.dragStart) {
            this.ctx.shapeManager.drawShape(this.dragStart, e)
        }
    }

    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
}

export default ShapeTool
