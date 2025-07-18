import { ShapeType } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import { Coord } from "@lib/types/shapes";

const { CreateScene, DrawScene, UpdateModifierHandlesPos, Render } = EventTypes

class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType) {
        super()
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {

        EventQueue.trigger(CreateScene, this.shapeType, dragStart.x, dragStart.y)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
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