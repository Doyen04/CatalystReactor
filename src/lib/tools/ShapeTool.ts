import { ShapeType } from '@lib/types/shapes'
import Tool from './Tool'
import { Coord } from '@lib/types/shapes'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import transformWorldToLocal from '@lib/helper/worldToLocal'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType, sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        const Matrix = this.resource.canvasKit.Matrix

        const { x, y } = transformWorldToLocal(Matrix, Matrix.invert(scene.worldMatrix), { x: e.offsetX, y: e.offsetY })
        
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
