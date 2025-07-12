import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";
import { PText, Shape } from "@lib/shapes";

const { CreateShape, DrawShape, FinalizeShape, EditText } = EventTypes

class TextTool extends Tool {
    private shape: Shape
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        if (this.shape && this.shape instanceof PText) {
            this.shape.destroy()
        }
        this.shape = EventQueue.trigger(CreateShape, 'text', e.offsetX, e.offsetY)
    }
    override handlePointerUp() {
        EventQueue.trigger(FinalizeShape)
    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent): void {

    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {
        EventQueue.trigger(DrawShape, dragStart, e.offsetX, e.offsetY, e.shiftKey)
    }
    override handleKeyDown(e: KeyboardEvent): void {
        if (this.shape instanceof PText) {
            switch (e.key) {
                case 'ArrowLeft':
                    this.shape.moveCursor('left', e.shiftKey);
                    break;
                case 'ArrowRight':
                    this.shape.moveCursor('right', e.shiftKey);
                    break;
                case 'ArrowUp':
                    this.shape.moveCursor('up', e.shiftKey);
                    break;
                case 'ArrowDown':
                    this.shape.moveCursor('down', e.shiftKey);
                    break;
                case 'Backspace':
                    this.shape.deleteText('backward');
                    break;
                case 'Delete':
                    this.shape.deleteText('forward');
                    break;
                case 'Enter':
                    this.shape.insertText('\n', e.shiftKey);
                    break;
                default:
                    // Insert regular characters
                    if (e.ctrlKey) {
                        this.handleControlKey(e.key)
                    }
                    else if (e.key.length === 1) {
                        this.shape.insertText(e.key, e.shiftKey);
                    }
            }
        }
    }
    handleControlKey(e: string) {
        if (this.shape instanceof PText) {
            switch (e.toLowerCase()) {
                case 'c':
                    this.shape.copyText();
                    break;
                case 'v':
                    this.shape.pasteText();
                    break;
            }
        }
    }
    override handleKeyUp(e: KeyboardEvent): void {

    }

}

export default TextTool;