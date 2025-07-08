import  SceneNode  from "./SceneGraph";
import { DimensionModifier } from "@lib/modifiers";
import { ShapeFactory } from "@lib/shapes";
import  EventQueue,{ EventTypes } from './EventQueue'

const { FinalizeShape, DrawShape, CreateShape } = EventTypes


class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    transientShape: SceneNode | null;
    dimensionMod: DimensionModifier;

    constructor() {
        this.scene = new SceneNode()
        this.transientShape = null
        this.selected = null
        this.dimensionMod = new DimensionModifier()

        EventQueue.subscribe(CreateShape, this.createShape.bind(this))
        EventQueue.subscribe(DrawShape, this.updateTransientShape.bind(this))
        EventQueue.subscribe(FinalizeShape, this.cleanUp.bind(this))
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
            console.log('Shape removed: too small');
        }
    }
}

export default SceneManager;