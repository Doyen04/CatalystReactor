import { ShapeType } from '@lib/types/shapes'
import Tool from './Tool'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType, cnvs: HTMLCanvasElement) {
        super(cnvs)
        this.shapeType = shape
    }

    override handlePointerDown(e: MouseEvent) {
        super.handlePointerDown(e)
        let scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        if (!scene) scene = this.sceneManager.getRootContainer()

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const shape = ShapeFactory.createShape(this.shapeType, {
            x: x,
            y: y,
        })

        if (shape) {
            const shapenode: SceneNode = new ShapeNode(shape)

            scene.addChildNode(shapenode)
            this.shapeManager.attachNode(shapenode)
        }
    }
    override handlePointerMove(e: MouseEvent): void {
        if (this.isPointerDown) {
            this.handlePointerDrag(e)
        }
    }
    override handlePointerUp(e: MouseEvent): void {
        this.shapeManager.handleTinyShapes()
        if (this.isDragging) {
            this.shapeManager.finishDrag()
        }
        super.handlePointerUp?.(e)
    }

    handlePointerDrag(e: MouseEvent): void {
        this.isDragging = true
        this.shapeManager.drawShape(this.dragStart, e)
    }

    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
}

export default ShapeTool
