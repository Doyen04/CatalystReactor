import Tool from './Tool'
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

    override handlePointerDown(e: MouseEvent) {
        super.handlePointerDown(e)
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
                return { type: 'row', gap: 10, padding: { top: 10, bottom: 10, left: 10, right: 10 }, alignment: 'start' }
            case 'column':
                return { type: 'column', gap: 10, padding: { top: 10, bottom: 10, left: 10, right: 10 }, alignment: 'start' }
            case 'grid':
                return { type: 'grid', gap: 10, padding: { top: 10, bottom: 10, left: 10, right: 10 } }
            case 'frame':
                return { type: 'frame', padding: { top: 10, bottom: 10, left: 10, right: 10 } }
            default:
                return null
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

    setShape(shape: ContainerType) {
        this.shapeType = shape
    }
}

export default GroupTool
