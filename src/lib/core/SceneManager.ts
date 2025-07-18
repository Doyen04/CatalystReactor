import SceneNode from "./SceneGraph";
import ShapeModifier from "@lib/modifiers/ShapeModifier";
import ShapeFactory from "@lib/shapes/base/ShapeFactory";
import EventQueue, { EventTypes } from './EventQueue'
import { Coord, ShapeType } from "@lib/types/shapes";

const {
    FinalizeShape, DrawScene, CreateScene, SceneCreated, FinaliseSelection,
    ShowHovered, SelectObject, SelectModifier, RemoveSelectedModifier,
    DragObject, ModifierSelected, DragModifier
} = EventTypes

class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    transientScene: SceneNode | null;
    shapeMod: ShapeModifier;
    hoveredScene: SceneNode | null;
    modifierSelected: boolean;

    constructor() {
        this.scene = new SceneNode()
        this.transientScene = null
        this.selected = null
        this.hoveredScene = null
        this.shapeMod = new ShapeModifier()
        this.modifierSelected = false
        //remember to add a shape created event

        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    addEvent() {
        EventQueue.subscribe(CreateScene, this.createScene.bind(this))
        EventQueue.subscribe(DrawScene, this.updateTransientScene.bind(this))
        EventQueue.subscribe(FinalizeShape, this.cleanUp.bind(this))

        EventQueue.subscribe(ShowHovered, this.showHovered.bind(this))
        EventQueue.subscribe(SelectObject, this.selectObject.bind(this))
        // EventQueue.subscribe(SelectShape, this.selectShape.bind(this))
        EventQueue.subscribe(ModifierSelected, this.handleModifierSelected.bind(this))
        EventQueue.subscribe(DragObject, this.dragSelectedObject.bind(this))
        EventQueue.subscribe(FinaliseSelection, this.handleSelectionCleanUp.bind(this))
        // EventQueue.subscribe(DragShape, this.dragSelectedShape.bind(this))
    }
    removeEvent() {
        EventQueue.unSubscribeAll(CreateScene)
        EventQueue.unSubscribeAll(DrawScene)
        EventQueue.unSubscribeAll(FinalizeShape)

        EventQueue.unSubscribeAll(ShowHovered)
        EventQueue.unSubscribeAll(SelectObject)

        EventQueue.unSubscribeAll(ModifierSelected)
        EventQueue.unSubscribeAll(DragObject)
        EventQueue.unSubscribeAll(FinaliseSelection)

    }
    getScene(): SceneNode {
        return this.scene
    }
    getDimModifier(): ShapeModifier {
        return this.shapeMod
    }
    getTransientScene(): SceneNode {
        return this.transientScene
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
        EventQueue.trigger(RemoveSelectedModifier)
        this.modifierSelected = false
    }

    handleModifierSelected() {
        this.modifierSelected = true
    }

    selectObject(x: number, y: number) {
        EventQueue.trigger(SelectModifier, x, y)
        if (this.modifierSelected) return
        this.selectShape(x, y)
    }

    selectShape(x: number, y: number) {
        const selected = this.getCollidedScene(x, y)

        if (!selected || !selected.getShape()) {
            this.selected = null
            this.shapeMod.setShape(null)
            return
        } else {
            this.selected = selected
            this.shapeMod.setShape(this.selected.getShape())
        }
    }

    dragSelectedObject(dx: number, dy: number, e: MouseEvent) {
        if (this.modifierSelected) {
            EventQueue.trigger(DragModifier, dx, dy, e)
        } else {
            this.dragSelectedShape(dx, dy, e)
        }
    }

    dragSelectedShape(dx: number, dy: number, e: MouseEvent) {
        if (!this.selected) {
            console.log('no selected shape');

            return
        }

        this.selected.shape.moveShape(dx, dy)
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

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.removeChildNode(node);
            // this.pushHistory();
        }
    }

    updateTransientScene(dragStart: Coord, x: number, y: number, shiftKey: boolean) {
        this.transientScene.shape.setSize(dragStart, x, y, shiftKey)
    }

    createScene(type: ShapeType, x: number, y: number): void {
        // Create a new shape based on the type and add it to the scene
        const shape =  ShapeFactory.createShape(type, { x, y });
        if (shape) {
            const scene: SceneNode = new SceneNode();
            scene.shape = shape
            this.addNode(scene);
            this.transientScene = scene;
            this.shapeMod.setShape(shape);
            EventQueue.trigger(SceneCreated, scene)
        }
    }

    cleanUp() {
        this.handleTinyShapes()
        this.transientScene = null
    }

    handleTinyShapes(): void {
        if (!this.transientScene?.shape) return;

        const { left, top, right, bottom } = this.transientScene.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        if (width < minSize || height < minSize) {
            this.transientScene.shape.setDim(100, 100)
            const { x, y } = this.transientScene.shape.getCoord()
            this.transientScene.shape.setCoord(x - 50, y - 50)
            console.log('Shape removed: too small add default size');
        }
    }
}

export default SceneManager;