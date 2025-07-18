import { Coord } from "@lib/types/shapes";
import Tool  from "./Tool";
import EventQueue, {EventTypes } from "@lib/core/EventQueue";

const { CreateScene, DrawScene } = EventTypes

class ImageTool extends Tool {
    
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {

        EventQueue.trigger(CreateScene, 'img', dragStart.x, dragStart.y)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
    }
   
    override handleKeyDown(e: KeyboardEvent): void {

    }
    override handleKeyUp(e: KeyboardEvent): void {

    }
}

export default ImageTool;