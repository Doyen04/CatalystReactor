import { ShapeType } from '@lib/types/shapes'
import Tool from './Tool'
import { Coord } from '@lib/types/shapes'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneNode from '@lib/core/SceneNode'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(
        shape: ShapeType,
        sceneManager: SceneManager,
        shapeManager: ShapeManager,
        cnvs: HTMLCanvasElement
    ) {
        super(sceneManager, shapeManager, cnvs)
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const shape = ShapeFactory.createShape(this.shapeType, {
            x: e.offsetX,
            y: e.offsetY,
        })
        if (shape) {
            const scene: SceneNode = new SceneNode(shape)
            this.sceneManager.addNode(scene)
            this.shapeManager.attachNode(scene)
        }
    }
    override handlePointerUp(dragStart: Coord, e: MouseEvent): void {
        this.shapeManager.handleTinyShapes()
        super.handlePointerUp?.(dragStart, e)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        const deltaX = e.offsetX - dragStart.x
        const deltaY = e.offsetY - dragStart.y

        // Handle flipping at the node level
        const isFlippedX = deltaX < 0
        const isFlippedY = deltaY < 0

        const currentNode = this.shapeManager.currentScene // You'll need to expose this
        if (currentNode) {
            currentNode.setFlip(isFlippedX, isFlippedY)
        }
        this.shapeManager.drawShape(dragStart, e)
    }

    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
}

export default ShapeTool
