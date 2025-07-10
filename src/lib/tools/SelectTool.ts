import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";

const { ShowHovered, SelectShape, DragShape } = EventTypes

class SelectTool extends Tool {
    private lastMouseCoord: Coords | null = null

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(SelectShape, e.offsetX, e.offsetY)
    }
    override handlePointerUp() {

    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent): void {
        EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {
        
        if (!this.lastMouseCoord) return

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y

        EventQueue.trigger(DragShape, dx, dy)

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
    }
}

export default SelectTool;