import { Tool } from "@/lib/tools";
import { EventTypes, EventQueue } from "@lib/core";

const { CreateScene, DrawScene, FinalizeShape } = EventTypes

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType) {
        super()
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coords, e: MouseEvent) {
    
        EventQueue.trigger(CreateScene, this.shapeType, dragStart.x, dragStart.y)
    }
    override handlePointerUp(coord: Coords, e: MouseEvent) {
        EventQueue.trigger(FinalizeShape)
    }
    override handlePointerMove(dragStart: Coords, e: MouseEvent) {
        
    }
    override handlePointerDrag(dragStart: Coords, e:MouseEvent): void {
    
        EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
    }
    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
    override handleKeyDown(e: KeyboardEvent): void {
        
    }
    override handleKeyUp(e: KeyboardEvent): void {
        
    }
}

export default ShapeTool;