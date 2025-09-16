import { ShapeType } from '@lib/types/shapes'
import Tool from './Tool'
import { Coord } from '@lib/types/shapes'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
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

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)
        console.log(x, y, 'scene',scene)

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
        this.shapeManager.drawShape(dragStart, e)
    }

    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
}

export default ShapeTool
