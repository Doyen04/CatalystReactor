import { Coord, IShape } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import PText from "@lib/shapes/primitives/PText";

const { ShowHovered, SelectObject, DragObject, FinaliseSelection, Render, UpdateModifierHandlesPos } = EventTypes

class SelectTool extends Tool {
    private lastMouseCoord: Coord | null = null

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(SelectObject, e.offsetX, e.offsetY)
        // EventQueue.trigger(Render)
    }

    override handlePointerUp() {
        EventQueue.trigger(FinaliseSelection)
        EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
    }

    override handlePointerMove(dragStart: Coord, e: MouseEvent): void {
        EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }

    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        if (!this.lastMouseCoord) {
            console.log('mousecoord is null');
            return
        }

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y

        EventQueue.trigger(DragObject, dx, dy, e)

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
    }

    override handleArrowKeys(e: KeyboardEvent): void {
        if (this.currentScene) {
            const shape = this.currentScene.getShape()

            if (shape instanceof PText && shape.canEdit()) {
                this.moveTextCursor(e, shape)
            } else {
                this.moveCurrentShape(e, shape)
            }
        }
    }

    override handleTextKey(e: KeyboardEvent): void {
        if (this.currentScene) {
            const shape = this.currentScene.getShape()

            if (shape instanceof PText && shape.canEdit()) {
                this.insertTextIntoShape(e, shape)
            }
        }
    }

    override handleEnter(e: KeyboardEvent) {
        if (this.currentScene) {
            const shape = this.currentScene.getShape()

            if (shape instanceof PText && shape.canEdit()) {
                shape.insertText('\n', e.shiftKey)
            }
        }
    }

    insertTextIntoShape(e: KeyboardEvent, shape:IShape) {
        if (shape instanceof PText) {
            shape.insertText(e.key, e.shiftKey)
        }
    }

    moveTextCursor(e: KeyboardEvent, shape:IShape) {
        if (shape instanceof PText) {
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
        EventQueue.trigger(UpdateModifierHandlesPos)
    }

    moveCurrentShape(e: KeyboardEvent, shape:IShape): void {
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
        EventQueue.trigger(UpdateModifierHandlesPos)
    }
}

export default SelectTool;