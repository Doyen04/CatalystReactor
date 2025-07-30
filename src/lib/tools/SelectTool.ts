import { Coord, IShape } from "@lib/types/shapes";
import Tool from "./Tool";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";

class SelectTool extends Tool {
    private lastMouseCoord: Coord | null = null
    private clickTimer: NodeJS.Timeout | null = null
    private clickCount: number = 0
    private lastClickTime: number = 0
    private doubleClickDelay: number = 300 // milliseconds

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
    }

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
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
            this.processClick(e, this.clickCount)
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
        console.log('Single click - normal selection')
        const selected = this.shapeManager.collide(e.offsetX, e.offsetY);
        if (selected) {
            return
        }
        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        if (!scene) {
            this.shapeManager.detachShape()
            return
        }
        const clickedShape = scene.getShape()
        this.shapeManager.attachShape(clickedShape)
        if (this.canEdit(clickedShape) && clickedShape.pointInShape(e.offsetX, e.offsetY)) {
            clickedShape.setCursorPosFromCoord(e.offsetX, e.offsetY)
        }

    }

    private handleDoubleClick(e: MouseEvent) {
        console.log('Double click detected')

        if (this.shapeManager.hasShape()) {
            const shape = this.shapeManager.currentShape

            if (shape.pointInShape(e.offsetX, e.offsetY)) {
                shape.startEditing()
                shape.selectAll()
            }
        }
    }

    override handlePointerUp() {
        this.shapeManager.finishDrag()
        // EventQueue.trigger(FinaliseSelection)
        // EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
    }

    override handlePointerMove(dragStart: Coord, e: MouseEvent): void {
        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        if (scene) {
            const shape = scene.getShape()
            this.shapeManager.modifierMgr.setHoveredShape(shape)
        } else {
            this.shapeManager.modifierMgr.resetHovered()
        }

        const handle = this.shapeManager.modifierMgr.handleHovering(e.offsetX, e.offsetY)
        if (handle) {
            return
        }

        if (this.cnvsElm && this.cnvsElm.style.cursor != "default") {
            this.cnvsElm.style.cursor = "default";
        }
    }

    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        if (!this.lastMouseCoord) {
            console.log('mousecoord is null');
            return
        }

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y
        if (this.shapeManager.hasSelection()) {
            this.shapeManager.drag(dx, dy, e)
        }

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
    }
    canEdit(shape: IShape) {
        return shape && typeof (shape).canEdit === 'function' && (shape).canEdit()
    }

    override toolChange(): void {
        super.toolChange()
        if (this.clickTimer) {
            clearTimeout(this.clickTimer)
            this.clickTimer = null
        }
    }
}

export default SelectTool;