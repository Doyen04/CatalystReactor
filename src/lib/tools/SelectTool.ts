import Tool from './Tool'
import SceneNode from '@lib/node/Scene'
import ResizeCursor from './ResizeCursor'

class SelectTool extends Tool {
    private hoveredScene: SceneNode | null = null
    private clickTimer: NodeJS.Timeout | null = null
    private clickCount: number = 0
    private lastClickTime: number = 0
    private doubleClickDelay: number = 300 // milliseconds

    constructor(cnvs: HTMLCanvasElement) {
        super(cnvs)
    }

    override handlePointerDown(e: MouseEvent) {
        console.log('pointer down')

        super.handlePointerDown(e)

        this.selectionHandler(e)

        this.handleClickCount(e)
    }

    selectionHandler(e: MouseEvent) {
        // 1. Check if we are clicking on handles of current selection
        const handleHit = this.shapeManager.handleHover(e.offsetX, e.offsetY)
        if (handleHit) {
            this.shapeManager.handleMouseDown(this.dragStart, e)
            return
        }

        const isDeep = e.ctrlKey || e.metaKey
        const currentSelection = this.shapeManager.currentScene
        
        let targetScene: SceneNode | null = null

        if (isDeep) {
            targetScene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY, true)
        } else if (currentSelection && currentSelection.getChildren().length > 0 && currentSelection.isCollide(e.offsetX, e.offsetY)) {
            // Drill down: Search within current container
            const children = currentSelection.getChildren()
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].isCollide(e.offsetX, e.offsetY)) {
                    targetScene = children[i]
                    break
                }
            }
            // If no child hit, stay with current selection
            if (!targetScene) targetScene = currentSelection
        } else {
            // Regular top-level selection
            targetScene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY, false)
        }

        if (targetScene !== currentSelection) {
            this.shapeManager.detachShape()
            if (targetScene && targetScene !== this.sceneManager.getRootContainer()) {
                this.shapeManager.attachNode(targetScene)
            }
        }

        this.shapeManager.handleMouseDown(this.dragStart, e)
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
        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.canEdit() && scene.isCollide(e.offsetX, e.offsetY)) {
                scene.setCursorPosFromCoord(e.offsetX, e.offsetY)
            }
        }
    }

    private handleDoubleClick(e: MouseEvent) {
        console.log('Double click detected', e)

        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.isCollide(e.offsetX, e.offsetY)) {
                scene.startEditing()
                scene.selectAll()

            }
        }
    }

    setCursorForHandle(handleID: string | null, rad: number) {
        if (!handleID) {
            const cursor = 'default'
            if (this.cnvsElm) {
                this.cnvsElm.style.cursor = cursor
            }
            return
        }

        let cursor = 'default'
        const degrees = (rad * 180) / Math.PI

        if (handleID.startsWith('size-')) {
            const pos = handleID.replace('size-', '')
            let baseAngle = 0

            switch (pos) {
                case 'top-left':
                    baseAngle = 45 // Northwest
                    break
                case 'top-right':
                    baseAngle = -45 // Northeast
                    break
                case 'bottom-left':
                    baseAngle = 135 // Southwest
                    break
                case 'bottom-right':
                    baseAngle = -135 // Southeast
                    break
                case 'top':
                    baseAngle = 90 // North
                    break
                case 'bottom':
                    baseAngle = -90 // South
                    break
                case 'left':
                    baseAngle = 180 // West
                    break
                case 'right':
                    baseAngle = -180 // East
                    break
            }

            const finalAngle = baseAngle + degrees
            cursor = ResizeCursor.createCursor(finalAngle)
        } else if (handleID === 'angle' || handleID.startsWith('angle-')) {
            const pos = handleID.replace('angle-', '')
            let baseAngle = 0

            switch (pos) {
                case 'top-left':
                    baseAngle = -135 // Northwest
                    break
                case 'top-right':
                    baseAngle = -45 // Northeast
                    break
                case 'bottom-left':
                    baseAngle = 135 // Southwest
                    break
                case 'bottom-right':
                    baseAngle = 45 // Southeast
                    break
            }
            
            const finalAngle = baseAngle + degrees
            cursor = ResizeCursor.createRotationCursorCSS(finalAngle)
        }

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
        const cScene = this.shapeManager.currentScene?.getRotationAngle() || 0
        this.setCursorForHandle(handle, cScene)

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
        if (parent === scene) return

        let coord = current.getCoord()
        coord = parent.localToWorld(coord.x, coord.y)

        if (current == scene) {
            return
        }

        const localCoord = scene.worldToLocal(coord.x, coord.y)

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
