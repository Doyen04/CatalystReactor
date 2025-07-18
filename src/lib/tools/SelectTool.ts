import { Coords } from "@lib/types/shapeTypes";
import Tool from "./Tool";
import EventQueue, {EventTypes } from "@lib/core/EventQueue";

const { ShowHovered, SelectObject, DragObject, FinaliseSelection } = EventTypes

class SelectTool extends Tool {
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(SelectObject, e.offsetX, e.offsetY)
    }
    override handlePointerUp() {
        EventQueue.trigger(FinaliseSelection)
    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent): void {
        EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {

        if (!this.lastMouseCoord) {
            console.log('mousecoord is null');

            return
        }

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y

        EventQueue.trigger(DragObject, dx, dy, e)

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
    }
    override handleKeyDown(e: KeyboardEvent): void {

    }
    override handleKeyUp(e: KeyboardEvent): void {
        
    }
}

export default SelectTool;