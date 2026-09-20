import Tool from './Tool'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import { ContainerType, LayoutConstraints } from '@lib/node/nodeTypes'
import type { ToolContext } from './ToolContext'

class GroupTool extends Tool {
    shapeType: ContainerType
    // currentContainer: ContainerNode | null
    constructor(shape: ContainerType, cnvs: HTMLCanvasElement, ctx: ToolContext) {
        super(cnvs, ctx)
        this.shapeType = shape
        // this.currentContainer = null
    }

    override handlePointerDown(e: MouseEvent) {
        super.handlePointerDown(e)
        let scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        if (!scene) scene = this.sceneManager.getRootContainer()

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const containerNode = this.sceneManager.addShapeToScene('plainRect', {
            x: x,
            y: y,
        }) as ContainerNode

        if (containerNode) {
            const layoutConstraints = this.getLayoutConstraints(this.shapeType)
            containerNode.setLayoutConstraints(layoutConstraints)

            this.shapeManager.attachNode(containerNode)
        }
    }

    private getLayoutConstraints(shapeType: ContainerType): LayoutConstraints {
        const padding = { top: 10, bottom: 10, left: 10, right: 10 }
        switch (shapeType) {
            case 'row':
                return { type: 'row', gap: 10, padding: padding, mainAlign: 'start', crossAlign: 'start' }
            case 'column':
                return { type: 'column', gap: 10, padding: padding, mainAlign: 'start', crossAlign: 'start' }
            case 'grid':
                return { type: 'grid', gridRowGap: 10, gridColumnGap: 10, padding: padding }
            case 'frame':
                return { type: 'frame', padding: padding }
            default:
                return null
        }
    }

    private fullyContains(container: SceneNode, shape: SceneNode): boolean {
        const containerCoord = container.getAbsoluteBoundingRect()
        const shapeCoord = shape.getAbsoluteBoundingRect()
        return (
            shapeCoord.left >= containerCoord.left &&
            shapeCoord.top >= containerCoord.top &&
            shapeCoord.right <= containerCoord.right &&
            shapeCoord.bottom <= containerCoord.bottom
        )
    }

    private captureContainedShapes(): void {
        const currentContainer = this.shapeManager.currentScene
        if (!currentContainer) return

        // Find all nodes that are fully contained within the group
        const containedNodes: SceneNode[] = []
        const allScenes = this.sceneManager.getAllScene()

        allScenes.forEach(scene => {
            if (scene !== currentContainer && scene) {
                if (this.fullyContains(currentContainer, scene)) {
                    containedNodes.push(scene)
                }
            }
        })

        // Move contained nodes to be children of the container
        containedNodes.forEach(node => {
            const parent = node.getParent()
            let coord = node.getCoord()
            coord = parent.localToWorld(coord.x, coord.y)
            const localCoord = currentContainer.worldToLocal(coord.x, coord.y)

            // Remove from current parent and re-parent into the container via the document
            node.setPosition(localCoord.x, localCoord.y)

            this.sceneManager.insertNode(node, currentContainer.id)
        })
    }

    override handlePointerMove(e: MouseEvent): void {
        if (this.isPointerDown) {
            this.handlePointerDrag(e)
        }
    }

    override handlePointerUp(e: MouseEvent): void {
        this.shapeManager.handleTinyShapes()
        this.captureContainedShapes()
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
