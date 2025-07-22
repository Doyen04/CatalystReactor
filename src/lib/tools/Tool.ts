import { useToolStore } from "@hooks/useTool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue"
import SceneNode from "@lib/core/SceneGraph";
import { Coord } from "@lib/types/shapes";

const { SceneCreated, FinalizeShape, SceneSelected, UpdateModifierHandlesPos, Render } = EventTypes

abstract class Tool {
    protected createdScene: SceneNode | null = null;
    protected selectedScene: SceneNode | null = null;

    constructor() {
        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    removeEvent() {
        EventQueue.unSubscribeAll(SceneCreated)
        EventQueue.unSubscribeAll(SceneSelected)
    }
    addEvent() {
        EventQueue.subscribe(SceneCreated, this.handleSceneCreated.bind(this))
        EventQueue.subscribe(SceneSelected, this.handleSceneSelected.bind(this))
    }
    handleSceneCreated(node: SceneNode) {
        console.log('scene created');
        this.createdScene = node
    }
    handleSceneSelected(node: SceneNode) {
        console.log('scene selected');
        this.selectedScene = node
    }
    handlePointerUp(coord: Coord, e: MouseEvent) {
        const { setDefaultTool } = useToolStore.getState()
        EventQueue.trigger(FinalizeShape)
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
        setDefaultTool()
    }
    handlePointerMove(dragStart: Coord, e: MouseEvent) {

    }
    abstract handlePointerDown(dragStart: Coord, e: MouseEvent): void;
    abstract handlePointerDrag(dragStart: Coord, e: MouseEvent): void;
    abstract handleKeyDown(e: KeyboardEvent): void;
    abstract handleKeyUp(e: KeyboardEvent): void;

    toolChange(): void {
        console.log('tool changed');
        if (!this.createdScene) return
        this.createdScene = null
    }
}

export default Tool;