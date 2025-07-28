import { Coord, IShape } from "@lib/types/shapes";
import { isPrintableCharUnicode } from "@/util/textUtil";
import ShapeManager from "@lib/core/ShapeManager";

class KeyboardTool {
    private shapeManager: ShapeManager | null = null;

    constructor(shapeManager: ShapeManager) {
        this.shapeManager = shapeManager
    }
    setCurrentTool(shapeManager: ShapeManager) {
        this.shapeManager = shapeManager
    }
    handleKeyDown(e: KeyboardEvent) {console.log(e.type, 'inside keyboard');
    
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected(e);
                break;
            case 'Escape':
                this.handleEscape();
                break;
            case 'Tab':
                this.handleTab(e);
                break;
            case 'Enter':
                this.handleEnter(e);
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowKeys(e);
                break;
            default:
                // Handle alphanumeric and other printable characters
                if (isPrintableCharUnicode(e.key)) {
                    this.handleTextKey(e)
                }
                break;
        }

    }
    handleKeyUp(e: KeyboardEvent) {

    }

    private handleTextKey(e: KeyboardEvent) {

        if (this.shapeManager.hasShape()) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                shape.insertText(e.key, e.shiftKey)
            }
        }
    }
    private deleteSelected(e: KeyboardEvent) {
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
    private handleEscape() {

    }
    private handleTab(e: KeyboardEvent) {

    }
    private handleEnter(e: KeyboardEvent) {
        if (this.shapeManager.hasShape()) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                shape.insertText('\n', e.shiftKey)
            }
        }
    }
    private handleArrowKeys(e: KeyboardEvent) {
        if (this.shapeManager.hasShape()) {
            const shape = this.shapeManager.currentShape

            if (this.canEdit(shape)) {
                this.moveTextCursor(e, shape)
            } else {
                this.moveCurrentShape(e, shape)
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
                this.shapeManager.move(0, -2)
                break;
            case 'ArrowDown':
                this.shapeManager.move(0, 2)
                break;
            case 'ArrowLeft':
                this.shapeManager.move(-2, 0)
                break;
            case 'ArrowRight':
                this.shapeManager.move(2, 0)
                break;
            default:
                console.log('direction not implemented');
                break;
        }
    }

    canEdit(shape: any) {
        return shape && typeof (shape as any).canEdit === 'function' && (shape as any).canEdit()
    }

}

export default KeyboardTool;