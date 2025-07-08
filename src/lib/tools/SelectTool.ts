import { Tool } from "@/lib/tools";
import { EventQueue, EventTypes } from "@lib/core";

const { CreateShape, DrawShape } = EventTypes

class SelectTool extends Tool {

    override handlePointerDown(coord: Coords, e: MouseEvent) {
        
    }
    override handlePointerUp() {

    }
    override handlePointerMove() {

    }
    override handlePointerDrag(dragStart: Coords, e: MouseEvent): void {
        
    }
}

export default SelectTool;