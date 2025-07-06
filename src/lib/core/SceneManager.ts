import { SceneNode } from "@/lib/core";

class SceneManager {
    private scene: SceneNode

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
}

export default SceneManager;