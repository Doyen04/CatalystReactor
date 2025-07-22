import { Coord } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";

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

    override handleKeyDown(e: KeyboardEvent): void {
        // const shape = this.createdScene.getShape()
        // console.log(shape);

        // if (shape instanceof PText) {
        //     switch (e.key) {
        //         case 'ArrowLeft':
        //             shape.moveCursor('left', e.shiftKey);
        //             break;
        //         case 'ArrowRight':
        //             shape.moveCursor('right', e.shiftKey);
        //             break;
        //         case 'ArrowUp':
        //             shape.moveCursor('up', e.shiftKey);
        //             break;
        //         case 'ArrowDown':
        //             shape.moveCursor('down', e.shiftKey);
        //             break;
        //         case 'Backspace':
        //             shape.deleteText('backward');
        //             break;
        //         case 'Delete':
        //             shape.deleteText('forward');
        //             break;
        //         case 'Enter':
        //             shape.insertText('\n', e.shiftKey);
        //             break;
        //         default:
        //             // Insert regular characters
        //             if (e.ctrlKey) {
        //                 this.handleControlKey(e.key)
        //             }
        //             else if (e.key.length === 1) {
        //                 shape.insertText(e.key, e.shiftKey);
        //             }
        //     }
        // }
        // EventQueue.trigger(Render)
    }

    handleControlKey(e: string) {
        // const shape = this.createdScene.getShape()
        // if (shape instanceof PText) {
        //     switch (e.toLowerCase()) {
        //         case 'c':
        //             shape.copyText();
        //             break;
        //         case 'v':
        //             shape.pasteText();
        //             break;
        //     }
        // }
    }

    override handleKeyUp(e: KeyboardEvent): void {

    }
}

export default SelectTool;