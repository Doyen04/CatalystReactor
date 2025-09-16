import Tool from './Tool'
import { Coord } from '@lib/types/shapes'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import { ContainerType, LayoutConstraints } from '@lib/node/nodeTypes'

class GroupTool extends Tool {
    shapeType: ContainerType
    constructor(shape: ContainerType, sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const shape = ShapeFactory.createShape('rect', {
            x: x,
            y: y,
        })

        if (shape) {
            const layoutConstraints = this.getLayoutConstraints(this.shapeType)
            const shapenode: SceneNode = new ContainerNode(shape, layoutConstraints)

            scene.addChildNode(shapenode)
            this.shapeManager.attachNode(shapenode)
        }
    }

    private getLayoutConstraints(shapeType: ContainerType): LayoutConstraints {
        switch (shapeType) {
            case 'row':
                return { type: 'row', gap: 10, padding: 10, alignment: 'start' }
            case 'column':
                return { type: 'column', gap: 10, padding: 10, alignment: 'start' }
            case 'grid':
                return { type: 'grid', gap: 10, padding: 10 }
            case 'frame':
                return { type: 'frame', padding: 10 }
            default:
                return null
        }
    }

    override handlePointerUp(dragStart: Coord, e: MouseEvent): void {
        this.shapeManager.handleTinyShapes()
        super.handlePointerUp?.(dragStart, e)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        this.shapeManager.drawShape(dragStart, e)
    }

    setShape(shape: ContainerType) {
        this.shapeType = shape
    }
}

export default GroupTool
