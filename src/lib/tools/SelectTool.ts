import { Coord } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";

const { ShowHovered, SelectObject, DragObject, FinaliseSelection, Render, UpdateModifierHandlesPos } = EventTypes

class SelectTool extends Tool {
    private lastMouseCoord: Coord | null = null

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(SelectObject, e.offsetX, e.offsetY)
        EventQueue.trigger(Render)
    }
    override handlePointerUp() {
        EventQueue.trigger(FinaliseSelection)
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
    }
    override handlePointerMove(dragStart: Coord, e: MouseEvent): void {
        EventQueue.trigger(ShowHovered, e.offsetX, e.offsetY)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {

        if (!this.lastMouseCoord) {
            console.log('mousecoord is null');

            return
        }

        const dx = e.offsetX - this.lastMouseCoord.x
        const dy = e.offsetY - this.lastMouseCoord.y

        EventQueue.trigger(DragObject, dx, dy, e)

        this.lastMouseCoord = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
    }
    override handleKeyDown(e: KeyboardEvent): void {

    }
    override handleKeyUp(e: KeyboardEvent): void {

    }
}

export default SelectTool;