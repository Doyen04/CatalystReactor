import { Tool } from "@/lib/tools";
import { EventTypes, EventQueue } from "@lib/core";

const { CreateShape, DrawShape, FinalizeShape } = EventTypes

class ShapeTool extends Tool {
    shape: ShapeType
    constructor(shape: ShapeType) {
        super()
        this.shape = shape
    }
    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
        EventQueue.trigger(CreateShape, this.shape, dragStart.x, dragStart.y)
    }
    override handlePointerUp(coord: Coords, e: MouseEvent) {
        EventQueue.trigger(FinalizeShape)
    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent) {
        
    }
    override handlePointerDrag(dragStart: Coords, e:MouseEvent): void {
    
        EventQueue.trigger(DrawShape, dragStart, e.offsetX, e.offsetY, e.shiftKey)
    }
    setShape(shape: ShapeType) {
        this.shape = shape
    }
    override handleKeyDown(e: KeyboardEvent): void {
        
    }
    override handleKeyUp(e: KeyboardEvent): void {
        
    }
}

export default ShapeTool;