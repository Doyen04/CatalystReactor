import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";
import { PText, Shape } from "@lib/shapes";

const { CreateShape, DrawShape, FinalizeShape, EditText } = EventTypes

class TextTool extends Tool {
    private shape: Shape
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
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
                    this.shape.moveCursor('left');
                    break;
                case 'ArrowRight':
                    this.shape.moveCursor('right');
                    break;
                case 'ArrowUp':
                    this.shape.moveCursor('up');
                    break;
                case 'ArrowDown':
                    this.shape.moveCursor('down');
                    break;
                case 'Backspace':
                    this.shape.deleteText('backward');
                    break;
                case 'Delete':
                    this.shape.deleteText('forward');
                    break;
                case 'Enter':
                    this.shape.insertText('\n');
                    break;
                default:
                    // Insert regular characters
                    if (e.key.length === 1) {
                        this.shape.insertText(e.key);
                    }
            }
        }
    }
    override handleKeyUp(e: KeyboardEvent): void {
        
    }

}

export default TextTool;