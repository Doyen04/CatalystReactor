import SceneNode from "./SceneGraph";
import { DimensionModifier } from "@lib/modifiers";
import { ShapeFactory } from "@lib/shapes";
import EventQueue, { EventTypes } from './EventQueue'

const { FinalizeShape, DrawShape, CreateShape, ShowHovered, SelectShape, DragShape } = EventTypes


class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    transientShape: SceneNode | null;
    dimensionMod: DimensionModifier;
    hoveredScene: SceneNode | null;

    constructor() {
        this.scene = new SceneNode()
        this.transientShape = null
        this.selected = null
        this.hoveredScene = null
        this.dimensionMod = new DimensionModifier()

        EventQueue.subscribe(CreateShape, this.createShape.bind(this))
        EventQueue.subscribe(DrawShape, this.updateTransientShape.bind(this))
        EventQueue.subscribe(FinalizeShape, this.cleanUp.bind(this))
        EventQueue.subscribe(ShowHovered, this.showHovered.bind(this))
        EventQueue.subscribe(SelectShape, this.selectShape.bind(this))
        EventQueue.subscribe(DragShape, this.dragSelectedShape.bind(this))
    }

    getScene(): SceneNode {
        return this.scene
    }
    getDimModifier(): DimensionModifier {
        return this.dimensionMod
    }
    getTransientShape(): SceneNode {
        return this.transientShape
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

    selectShape(x: number, y: number) {
        const selected = this.getCollidedScene(x, y)

        if (!selected || !selected.getShape()) {
            this.selected = null
            this.dimensionMod.setShape(null)
            return
        } else {
            this.selected = selected
            this.dimensionMod.setShape(this.selected.getShape())
        }
    }

    dragSelectedShape(dx: number, dy: number) {
        if (!this.selected) return

        this.selected.shape.moveShape(dx, dy)
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

    showHovered(x: number, y: number) {
        const hoveredScene = this.getCollidedScene(x, y)

        if (!hoveredScene || !hoveredScene.getShape()) {
            if (this.hoveredScene) this.hoveredScene.shape.setHovered(false)
            this.hoveredScene = null
            return
        }

        // Reset previously hovered shape
        if (this.hoveredScene !== hoveredScene) {
            if (this.hoveredScene) this.hoveredScene.shape.setHovered(false)
            this.hoveredScene = hoveredScene
        }

        this.hoveredScene.shape.setHovered(true)

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

    updateTransientShape(dragStart: Coords, x: number, y: number, shiftKey: boolean) {
        this.transientShape.shape.setSize(dragStart, x, y, shiftKey)
    }

    createShape(type: ShapeType, x: number, y: number) {

        // Create a new shape based on the type and add it to the scene
        const node = ShapeFactory.createShape(type, { x, y });
        this.addNode(node);
        this.transientShape = node;
        this.dimensionMod.setShape(node.shape!);
        console.log(this.transientShape);
    }

    cleanUp() {
        this.discardTinyShapes()
        this.transientShape = null
    }

    discardTinyShapes(): void {
        if (!this.transientShape?.shape) return;

        const { left, top, right, bottom } = this.transientShape.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        if (width < minSize || height < minSize) {
            this.removeNode(this.transientShape);
            this.dimensionMod.setShape(null)
            console.log('Shape removed: too small');
        }
    }
}

export default SceneManager;