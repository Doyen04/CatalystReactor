import { SceneNode } from "@/lib/core";
import { DimensionModifier } from "@lib/modifiers";
import { ShapeFactory } from "@lib/shapes";

class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    activeShape: SceneNode | null;
    dimensionMod: DimensionModifier;

    constructor() {
        this.scene = new SceneNode()
    }
    addNode(node: SceneNode, parent?: SceneNode) {
        if (!parent) {
            this.scene.addChildNode(node)
        }else{
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
    createShape(type: ShapeType, x: number, y: number) {

        // Create a new shape based on the type and add it to the scene
        const node = ShapeFactory.createShape(type, { x, y });
        this.addNode(node);
        this.activeShape = node;
        this.dimensionMod.setShape(node.shape!);
        console.log(this.activeShape);
    }

    discardTinyShapes(): void {
        if (!this.activeShape?.shape) return;

        const { left, top, right, bottom } = this.activeShape.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        if (width < minSize || height < minSize) {
            this.removeNode(this.activeShape);
            console.log('Shape removed: too small');
        }
    }
}

export default SceneManager;