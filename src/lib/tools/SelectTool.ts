import { Coord, IShape } from "@lib/types/shapes";
import Tool from "./Tool";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";
import ModifierManager from "@lib/core/ModifierManager";

class SelectTool extends Tool {
    private lastMouseCoord: Coord | null = null
    private clickTimer: NodeJS.Timeout | null = null
    private clickCount: number = 0
    private lastClickTime: number = 0
    private doubleClickDelay: number = 300 // milliseconds

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, modifierManager: ModifierManager) {
        super(sceneManager, shapeManager, modifierManager)
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

        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        if (scene) {
            const shape = scene.getShape()
            this.shapeManager.attachShape(shape)
            this.modifierManager.attachShape(shape)
            if (this.canEdit(shape) && shape.pointInShape(e.offsetX, e.offsetY)) {
                shape.setCursorPosFromCoord(e.offsetX, e.offsetY)
            }
        } else {
            this.shapeManager.detachShape()
            this.modifierManager.detachShape()
        }

    }

    private handleDoubleClick(e: MouseEvent) {
        console.log('Double click detected')

        if (this.shapeManager.currentShape) {
            const shape = this.shapeManager.currentShape

            if (shape.pointInShape(e.offsetX, e.offsetY)) {
                shape.startEditing()
                shape.selectAll()
            }
        }
    }

    override handlePointerUp() {

        // EventQueue.trigger(FinaliseSelection)
        // EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
    }

    override handlePointerMove(dragStart: Coord, e: MouseEvent): void {
        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
        if (scene) {
            const shape = scene.getShape()
            this.modifierManager.setHoveredShape(shape)
        }else{
            this.modifierManager.resetHovered()
        }
        // EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }

    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        if (!this.lastMouseCoord) {
            console.log('mousecoord is null');
            return
        }

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y

        this.shapeManager.dragShape(dx, dy)
        this.modifierManager.update()

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
    }

    override handleArrowKeys(e: KeyboardEvent): void {
        if (this.shapeManager.currentShape) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                this.moveTextCursor(e, shape)
            } else {
                this.moveCurrentShape(e, shape)
            }
        }
    }

    override handleTextKey(e: KeyboardEvent): void {

        if (this.shapeManager.currentShape) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                shape.insertText(e.key, e.shiftKey)
            }
        }
    }

    override handleEnter(e: KeyboardEvent) {
        if (this.shapeManager.currentShape) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                shape.insertText('\n', e.shiftKey)
            }
        }
    }

    override handleDelete(e: KeyboardEvent): void {
        if (this.shapeManager.currentShape) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                switch (e.key) {
                    case "Delete":
                        shape.deleteText('forward')
                        break;
                    case "Backspace":
                        shape.deleteText('backward')
                        break;
                    default:
                        console.log('delete direction not implemented');
                        break;
                }
            } else {
                console.log('rrrrr', 'deleting');

            }
        }
    }

    moveTextCursor(e: KeyboardEvent, shape: IShape) {
        if (shape) {
            switch (e.key) {
                case 'ArrowUp':
                    shape.moveCursor('up', e.shiftKey)
                    break;
                case 'ArrowDown':
                    shape.moveCursor('down', e.shiftKey)
                    break;
                case 'ArrowLeft':
                    shape.moveCursor('left', e.shiftKey)
                    break;
                case 'ArrowRight':
                    shape.moveCursor('right', e.shiftKey)
                    break;
                default:
                    console.log('direction not implemented');
                    break;
            }
        }
    }

    moveCurrentShape(e: KeyboardEvent, shape: IShape): void {
        console.log(e.key);

        switch (e.key) {
            case 'ArrowUp':
                shape.moveShape(0, -2)
                break;
            case 'ArrowDown':
                shape.moveShape(0, 2)
                break;
            case 'ArrowLeft':
                shape.moveShape(-2, 0)
                break;
            case 'ArrowRight':
                shape.moveShape(2, 0)
                break;
            default:
                console.log('direction not implemented');
                break;
        }
        this.modifierManager.update()
    }

    canEdit(shape: any) {
        return shape && typeof (shape as any).canEdit === 'function' && (shape as any).canEdit()
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