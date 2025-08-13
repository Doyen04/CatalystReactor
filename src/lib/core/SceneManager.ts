import { Canvas } from "canvaskit-wasm";
import SceneNode from "./SceneGraph";


class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    hoveredScene: SceneNode | null;
    modifierSelected: boolean;

    constructor() {
        this.scene = new SceneNode(null)
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
        // EventQueue.subscribe(DeleteScene, this.handleDeleteScene.bind(this))

    }
    removeEvent() {
        // EventQueue.unSubscribeAll(FinaliseSelection)
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

    getCollidedScene(x: number, y: number): SceneNode | null {
        const flattened = this.flattenScene();

        for (const node of flattened) {
            if (node && node.isCollide(x, y)) {
                return node;
            }
        }
        return null;
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

    draw(skCnvs: Canvas) {
        this.scene.draw(skCnvs);
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        } if (this.selected) {
            this.selected.destroy()
            this.selected = null
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