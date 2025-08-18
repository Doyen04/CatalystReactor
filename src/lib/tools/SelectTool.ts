import { Coord, IShape } from "@lib/types/shapes";
import Tool from "./Tool";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";
import Handle from "@lib/modifiers/Handles";
import SceneNode from "@lib/core/SceneNode";

class SelectTool extends Tool {
    private hoveredScene: SceneNode | null = null;
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
        console.log(selected, 'selected already');

        if (selected) {
            return
        }
        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        console.log(scene,'scene selected');
        
        if (!scene) {
            this.shapeManager.detachShape()
            return
        }

        this.shapeManager.attachNode(scene)
        if (this.canEdit(scene.getShape()) && scene.getShape().pointInShape(e.offsetX, e.offsetY)) {
            scene.getShape().setCursorPosFromCoord(e.offsetX, e.offsetY)
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

    setCursorForHandle(handle: Handle) {
        if (!handle) {
            const cursor = "default"
            if (this.cnvsElm) {
                this.cnvsElm.style.cursor = cursor;
            }
            return
        };

        let cursor = "default";
        if (handle.type == 'size') {
            switch (handle.pos) {
                case 'top-left':
                    cursor = 'nwse-resize'
                    break;
                case 'top-right':
                    cursor = 'nesw-resize'
                    break;
                case 'bottom-left':
                    cursor = 'nesw-resize'
                    break;
                case 'bottom-right':
                    cursor = 'nwse-resize'
                    break;
                case 'top':
                    cursor = 'ns-resize'
                    break;
                case 'bottom':
                    cursor = 'ns-resize'
                    break;
                case 'left':
                    cursor = 'ew-resize'
                    break;
                case 'right':
                    cursor = 'ew-resize'
                    break;
                default:
                    break;
            }
        }
        // Set the cursor on the canvas element
        if (this.cnvsElm) {
            this.cnvsElm.style.cursor = cursor;
        }
    }

    override handlePointerMove(dragStart: Coord, e: MouseEvent): void {
        const handle = this.shapeManager.handleHover(e.offsetX, e.offsetY)
        this.setCursorForHandle(handle)

        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        this.setHoveredShape(scene)

    }

    setHoveredShape(scene: SceneNode) {
        if (this.hoveredScene) {
            this.hoveredScene.getShape().setHovered(false)
        }
        this.hoveredScene = scene

        if (!scene) return
        this.shapeManager.resetHover(scene)
        this.hoveredScene.getShape().setHovered(true)
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