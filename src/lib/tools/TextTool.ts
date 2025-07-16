import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import PText from "@lib/shapes/primitives/PText";

const { CreateScene, DrawScene, EditText } = EventTypes

class TextTool extends Tool {
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        if (this.createdScene) {
            console.log('creating another shape');

            const shape = this.createdScene.getShape()
            shape.destroy()
        }
        EventQueue.trigger(CreateScene, 'text', e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {
        EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
    }
    override handleKeyDown(e: KeyboardEvent): void {
        const shape = this.createdScene.getShape()
        console.log(shape);

        if (shape instanceof PText) {
            switch (e.key) {
                case 'ArrowLeft':
                    shape.moveCursor('left', e.shiftKey);
                    break;
                case 'ArrowRight':
                    shape.moveCursor('right', e.shiftKey);
                    break;
                case 'ArrowUp':
                    shape.moveCursor('up', e.shiftKey);
                    break;
                case 'ArrowDown':
                    shape.moveCursor('down', e.shiftKey);
                    break;
                case 'Backspace':
                    shape.deleteText('backward');
                    break;
                case 'Delete':
                    shape.deleteText('forward');
                    break;
                case 'Enter':
                    shape.insertText('\n', e.shiftKey);
                    break;
                default:
                    // Insert regular characters
                    if (e.ctrlKey) {
                        this.handleControlKey(e.key)
                    }
                    else if (e.key.length === 1) {
                        shape.insertText(e.key, e.shiftKey);
                    }
            }
        }
    }
    handleControlKey(e: string) {
        const shape = this.createdScene.getShape()
        if (shape instanceof PText) {
            switch (e.toLowerCase()) {
                case 'c':
                    shape.copyText();
                    break;
                case 'v':
                    shape.pasteText();
                    break;
            }
        }
    }
    override handleKeyUp(e: KeyboardEvent): void {

    }

}

export default TextTool;