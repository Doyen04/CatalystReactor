import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";

const { CreateShape, DrawShape, FinalizeShape, EditText } = EventTypes

class TextTool extends Tool {
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(CreateShape, 'text', e.offsetX, e.offsetY)
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
        EventQueue.trigger(EditText, e)
    }
    override handleKeyUp(e: KeyboardEvent): void {
        
    }
}

export default TextTool;