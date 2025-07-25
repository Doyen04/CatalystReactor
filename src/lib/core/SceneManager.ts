import SceneNode from "./SceneGraph";
import ShapeModifier from "@lib/modifiers/ShapeModifier";
import ShapeFactory from "@lib/shapes/base/ShapeFactory";
import EventQueue, { EventTypes } from './EventQueue'
import { Coord, ShapeType } from "@lib/types/shapes";

const {
    FinalizeShape, DrawScene, CreateScene, FinaliseSelection,
    ShowHovered, SelectObject, DeleteScene,
    DragObject,
} = EventTypes

class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    hoveredScene: SceneNode | null;
    modifierSelected: boolean;

    constructor() {
        this.scene = new SceneNode()
        this.selected = null
        this.hoveredScene = null
        this.modifierSelected = false
        //remember to add a shape created event

        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    addEvent() {
        // EventQueue.subscribe(CreateScene, this.createScene.bind(this))
        // EventQueue.subscribe(DrawScene, this.updateTransientScene.bind(this))
        // EventQueue.subscribe(FinalizeShape, this.cleanUp.bind(this))

        EventQueue.subscribe(ShowHovered, this.showHovered.bind(this))

        EventQueue.subscribe(SelectObject, this.selectObject.bind(this))
        EventQueue.subscribe(DragObject, this.dragSelectedObject.bind(this))
        EventQueue.subscribe(FinaliseSelection, this.handleSelectionCleanUp.bind(this))
        EventQueue.subscribe(DeleteScene, this.handleDeleteScene.bind(this))

    }
    removeEvent() {
        // EventQueue.unSubscribeAll(CreateScene)
        // EventQueue.unSubscribeAll(DrawScene)
        // EventQueue.unSubscribeAll(FinalizeShape)

        EventQueue.unSubscribeAll(ShowHovered)

        EventQueue.unSubscribeAll(SelectObject)
        EventQueue.unSubscribeAll(DragObject)
        EventQueue.unSubscribeAll(FinaliseSelection)

    }
    getScene(): SceneNode {
        return this.scene
    }
    // getTransientScene(): SceneNode {
    //     return this.transientScene
    // }

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.removeChildNode(node);
            // this.pushHistory();
        }
    }

    addNode(node: SceneNode, parent?: SceneNode) {
        if (!parent) {
            this.scene.addChildNode(node)
        } else {
            parent.addChildNode(node);
        }
        // this.pushHistory();
        // this.render();
    }

    handleDeleteScene() {
        // const { currentScene, clearCurrentScene, clearProperties } = useSceneStore.getState()
        // currentScene.getShape().destroy()
        // this.removeNode(currentScene)
        // this.shapeMod.setShape(null)
        // clearCurrentScene()
        // clearProperties()
        // this.selected = null
    }

    getCollidedScene(x: number, y: number): SceneNode | null {
        const flattened = this.flattenScene();

        for (const node of flattened) {
            if (node && node.isCollide(x, y)) {
                return node;
            }
        }
        return null;
    }

    handleSelectionCleanUp() {
        this.shapeMod.handleRemoveModiferHandle()
        this.modifierSelected = false
    }

    selectObject(x: number, y: number) {
        const modifierHandleSelected = this.shapeMod.selectModifier(x, y)
        if (modifierHandleSelected) {
            this.modifierSelected = true
            return
        } else {
            const result = this.selectShape(x, y)
            // const { setCurrentScene, currentScene, clearCurrentScene } = useSceneStore.getState()//update
            // if (result) {
            //     setCurrentScene(result)
            // } else {
            //     if (currentScene) {
            //         currentScene.getShape().cleanUp()
            //     }
            //     clearCurrentScene()
            // }
        }
    }

    selectShape(x: number, y: number): SceneNode | null {
        const selected = this.getCollidedScene(x, y)

        if (!selected || !selected.getShape()) {
            this.selected = null
            this.shapeMod.setShape(null)
            return null
        } else {
            this.selected = selected
            this.shapeMod.setShape(this.selected.getShape())
            return selected
        }
    }

    dragSelectedObject(dx: number, dy: number, e: MouseEvent) {
        if (this.modifierSelected) {
            this.shapeMod.handleModifierDrag(dx, dy, e)
        } else {
            // this.dragSelectedShape(dx, dy, e)
        }
    }

    showHovered(x: number, y: number) {
        const hoveredScene = this.getCollidedScene(x, y)

        if (!hoveredScene || !hoveredScene.getShape()) {
            if (this.hoveredScene) this.hoveredScene.shape.setHovered(false)
            this.hoveredScene = null
            this.shapeMod.setIsHovered(false)
            return
        }

        // Reset previously hovered shape
        if (this.hoveredScene !== hoveredScene) {
            if (this.hoveredScene) this.hoveredScene.shape.setHovered(false)
            this.hoveredScene = hoveredScene
        }
        this.hoveredScene.shape.setHovered(true)

        if (!this.shapeMod || !this.shapeMod.hasShape()) return

        if (this.shapeMod.getShape() == this.hoveredScene.getShape()) {
            this.shapeMod.setIsHovered(true)
        } else if (this.selected == this.hoveredScene) {
            this.shapeMod.setShape(this.selected.getShape())
            this.shapeMod.setIsHovered(true)
        } else {
            this.shapeMod.setIsHovered(false)
        }


    }

    flattenScene(): SceneNode[] {
        const flattened: SceneNode[] = [];

        const traverse = (node: SceneNode) => {
            flattened.push(node);
            node.children.forEach(child => traverse(child));
        };

        this.scene.children.forEach(child => traverse(child));
        return flattened
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        } if (this.selected) {
            this.selected.destroy()
            this.selected = null
        }

        if (this.transientScene) {
            this.transientScene.destroy()
            this.transientScene = null
        }
        if (this.shapeMod) {
            this.shapeMod.destroy()
            this.shapeMod = null
        }
        if (this.hoveredScene) {
            this.hoveredScene.destroy()
            this.hoveredScene = null
        }
        if (this.modifierSelected) {
            this.modifierSelected = false
        }
    }
}

export default SceneManager;