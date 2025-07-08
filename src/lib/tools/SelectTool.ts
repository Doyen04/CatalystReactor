import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";

const { CreateShape, DrawShape ,ShowHovered} = EventTypes

class SelectTool extends Tool {

    override handlePointerDown(coord: Coords, e: MouseEvent) {
        
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