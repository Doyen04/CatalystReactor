import { EventQueue, EventTypes, SceneNode } from "@lib/core";

const {SceneCreated} = EventTypes

abstract class Tool {
    protected createdScene: SceneNode| null = null;

    constructor(){
        this.setUpEvent()
    }
    setUpEvent(){
        this.removeEvent()
        this.addEvent()
    }
    removeEvent(){
        EventQueue.unSubscribeAll(SceneCreated)
    }
    addEvent(){
        EventQueue.subscribe(SceneCreated, this.handleSceneCreated.bind(this))
    }
    handleSceneCreated(node: SceneNode){console.log('scene created');
        this.createdScene = node
    }
    abstract handlePointerDown(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerUp(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerMove(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerDrag(dragStart: Coords, e: MouseEvent): void;
    abstract handleKeyDown(e: KeyboardEvent): void;
    abstract handleKeyUp(e: KeyboardEvent): void;
    cleanUp(): void {
        if(!this.createdScene) return
        this.createdScene.getShape().destroy()
        this.createdScene.destroy()
        this.createdScene = null
    }
}

export default Tool;