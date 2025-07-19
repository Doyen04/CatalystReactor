import EventQueue, { EventTypes } from "@lib/core/EventQueue"
import SceneNode from "@lib/core/SceneGraph";
import { Coord } from "@lib/types/shapes";

const { SceneCreated, FinalizeShape ,UpdateModifierHandlesPos,Render} = EventTypes

abstract class Tool {
    protected createdScene: SceneNode | null = null;

    constructor() {
        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    removeEvent() {
        EventQueue.unSubscribeAll(SceneCreated)
    }
    addEvent() {
        EventQueue.subscribe(SceneCreated, this.handleSceneCreated.bind(this))
    }
    handleSceneCreated(node: SceneNode) {
        console.log('scene created');
        this.createdScene = node
    }
    handlePointerUp(coord: Coord, e: MouseEvent) {
        EventQueue.trigger(FinalizeShape)
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
    }
    handlePointerMove(dragStart: Coord, e: MouseEvent) {

    }
    abstract handlePointerDown(dragStart: Coord, e: MouseEvent): void;
    abstract handlePointerDrag(dragStart: Coord, e: MouseEvent): void;
    abstract handleKeyDown(e: KeyboardEvent): void;
    abstract handleKeyUp(e: KeyboardEvent): void;

    cleanUp(): void {

        if (!this.createdScene) return
        this.createdScene.getShape().destroy()
        this.createdScene.destroy()
        this.createdScene = null
    }
}

export default Tool;