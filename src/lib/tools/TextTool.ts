import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import { Coord } from "@lib/types/shapes";

const { CreateScene, DrawScene, UpdateModifierHandlesPos, Render,EditText } = EventTypes

class TextTool extends Tool {
    // private lastMouseCoord: Coords | null = null
    //move to shape
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        EventQueue.trigger(CreateScene, 'text', e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
        EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
    }
    override handleKeyDown(e: KeyboardEvent): void {
        
    }
    override handleKeyUp(e: KeyboardEvent): void {

    }

}

export default TextTool;