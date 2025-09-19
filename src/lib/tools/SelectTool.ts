import Tool from './Tool'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import Handle from '@lib/modifiers/Handles'
import SceneNode from '@lib/node/Scene'

class SelectTool extends Tool {
    private hoveredScene: SceneNode | null = null
    private clickTimer: NodeJS.Timeout | null = null
    private clickCount: number = 0
    private lastClickTime: number = 0
    private doubleClickDelay: number = 300 // milliseconds

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
    }

    override handlePointerDown(e: MouseEvent) {
        console.log('pointer down')

        super.handlePointerDown(e)
        const selected = this.shapeManager.collide(e.offsetX, e.offsetY)

        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        const currentSelection = this.shapeManager.currentScene

        if (selected || scene === currentSelection) {
            this.shapeManager.handleMouseDown(this.dragStart, e)
            return
        } else {
            this.shapeManager.detachShape()
        }

        if (scene) {
            this.shapeManager.attachNode(scene)
        }
        this.shapeManager.handleMouseDown(this.dragStart, e)

        this.handleClickCount(e)
    }

    private handleClickCount(e: MouseEvent) {
        const currentTime = Date.now()
        if (currentTime - this.lastClickTime > this.doubleClickDelay) {
            this.clickCount = 0
        }

        this.clickCount++
        this.lastClickTime = currentTime
        if (this.clickTimer) {
            clearTimeout(this.clickTimer)
        }

        // Set timer to process the click(s)
        this.clickTimer = setTimeout(() => {
            if (!this.isDragging) {
                this.processClick(e, this.clickCount)
            }
            this.clickCount = 0
        }, this.doubleClickDelay)
    }

    private processClick(e: MouseEvent, clickCount: number) {
        if (clickCount >= 2) {
            this.handleDoubleClick(e)
        } else {
            this.handleSingleClick(e)
        }
    }

    private handleSingleClick(e: MouseEvent) {
        console.log('click triggered', e)
        // if (this.canEdit(scene.getScene()) && scene.pointInShape(e.offsetX, e.offsetY)) {
        //     scene.setCursorPosFromCoord(e.offsetX, e.offsetY)
        // }
    }

    private handleDoubleClick(e: MouseEvent) {
        console.log('Double click detected', e)

        // if (this.shapeManager.hasShape()) {
        //     const shape = this.shapeManager.currentShape

        //     if (shape.pointInShape(e.offsetX, e.offsetY)) {
        //         shape.startEditing()
        //         shape.selectAll()
        //     }
        // }
    }

    setCursorForHandle(handle: Handle) {
        if (!handle) {
            const cursor = 'default'
            if (this.cnvsElm) {
                this.cnvsElm.style.cursor = cursor
            }
            return
        }

        let cursor = 'default'
        if (handle.type == 'size') {
            switch (handle.pos) {
                case 'top-left':
                    cursor = 'nwse-resize'
                    break
                case 'top-right':
                    cursor = 'nesw-resize'
                    break
                case 'bottom-left':
                    cursor = 'nesw-resize'
                    break
                case 'bottom-right':
                    cursor = 'nwse-resize'
                    break
                case 'top':
                    cursor = 'ns-resize'
                    break
                case 'bottom':
                    cursor = 'ns-resize'
                    break
                case 'left':
                    cursor = 'ew-resize'
                    break
                case 'right':
                    cursor = 'ew-resize'
                    break
                default:
                    break
            }
        } else if (handle.type === 'angle') {
            switch (handle.pos) {
                case 'top-left':
                case 'bottom-left':
                case 'bottom-right':
                case 'top-right':
                    cursor = 'move'
                    break
                default:
                    break
            }
        }
        // Set the cursor on the canvas element
        if (this.cnvsElm) {
            this.cnvsElm.style.cursor = cursor
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (this.isPointerDown) {
            this.handlePointerDrag(e)
        } else {
            this.moveHandler(e)
        }
    }

    moveHandler(e: MouseEvent) {
        const handle = this.shapeManager.handleHover(e.offsetX, e.offsetY)
        this.setCursorForHandle(handle)

        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        this.setHoveredShape(scene)
    }

    setHoveredShape(scene: SceneNode) {
        if (this.hoveredScene) {
            this.hoveredScene.setHovered(false)
        }
        this.hoveredScene = scene

        if (!scene) return
        this.shapeManager.resetHover(scene)
        this.hoveredScene.setHovered(true)
    }

    handlePointerDrag(e: MouseEvent): void {
        if (!this.dragStart) {
            console.log('mousecoord is null')
            return
        }
        this.shapeManager.drag(this.dragStart, e)
        this.isDragging = true
    }

    repositionShape(e: MouseEvent) {
        let scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        const root = this.sceneManager.getRootContainer()
        const current = this.shapeManager.currentScene
        if (!current) return
        const parent = current.getParent()

        if (!scene) scene = root

        const coord = current.getAbsoluteBoundingRect()
        console.log(parent, 'ondrag', scene)
        if (current == scene) {
            return
        }

        const localCoord = scene.worldToLocal(coord.left, coord.top)

        parent.removeChildNode(current)

        current.setPosition(localCoord.x, localCoord.y)
        scene.addChildNode(current)
    }

    override handlePointerUp(e: MouseEvent) {
        console.log('up', this.isDragging)
        this.repositionShape(e)
        if (this.isDragging) {
            this.shapeManager.finishDrag()
        }
        this.isPointerDown = false
        this.dragStart = null
        this.isDragging = false
    }

    override toolChange(): void {
        super.toolChange()
        if (this.clickTimer) {
            clearTimeout(this.clickTimer)
            this.clickTimer = null
        }
    }
}

export default SelectTool
