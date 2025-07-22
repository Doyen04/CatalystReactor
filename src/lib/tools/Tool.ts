import { useSceneStore } from "@hooks/sceneStore";
import { useToolStore } from "@hooks/useTool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue"
import SceneNode from "@lib/core/SceneGraph";
import { Coord } from "@lib/types/shapes";

const { FinalizeShape, UpdateModifierHandlesPos, DrawScene, Render } = EventTypes

abstract class Tool {

    constructor() {
        this.setUpEvent()
    }
    setUpEvent() {

    }
    get currentScene(): SceneNode | null {
        const { getActiveScene } = useSceneStore.getState()
        return getActiveScene()
    }
    handlePointerUp(coord: Coord, e: MouseEvent) {
        const { setDefaultTool } = useToolStore.getState()
        EventQueue.trigger(FinalizeShape)
        EventQueue.trigger(UpdateModifierHandlesPos)
        // EventQueue.trigger(Render)
        setDefaultTool()
    }
    handleTextKey(e: KeyboardEvent): void {

    };
    handleArrowKeys(e: KeyboardEvent): void {

    };
    handleEnter(e: KeyboardEvent): void {

    };
    handleDelete(e:KeyboardEvent):void{

    }

    handlePointerMove(dragStart: Coord, e: MouseEvent): void {

    };
    abstract handlePointerDrag(dragStart: Coord, e: MouseEvent): void;
    abstract handlePointerDown(dragStart: Coord, e: MouseEvent): void;

    toolChange(): void {
        console.log('tool changed');
    }
}

export default Tool;