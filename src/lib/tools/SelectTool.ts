import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";

const { ShowHovered, SelectShape } = EventTypes

class SelectTool extends Tool {

    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        EventQueue.trigger(SelectShape, e.offsetX, e.offsetY)
    }
    override handlePointerUp() {

    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent): void {
        EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {

    }
}

export default SelectTool;