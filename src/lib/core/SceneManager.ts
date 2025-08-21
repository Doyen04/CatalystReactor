import { Canvas } from 'canvaskit-wasm'
import SceneNode from './SceneNode'
import ShapeModifier from '@lib/modifiers/ShapeModifier'

class SceneManager {
    private scene: SceneNode
    private shapeModifier: ShapeModifier

    constructor(shapeModifier: ShapeModifier) {
        this.scene = new SceneNode(null)
        this.shapeModifier = shapeModifier
        //remember to add a shape created event
    }
    getScene(): SceneNode {
        return this.scene
    }

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.removeChildNode(node)
            // this.pushHistory();
        }
    }

    addNode(node: SceneNode, parent?: SceneNode) {
        if (!parent) {
            this.scene.addChildNode(node)
        } else {
            parent.addChildNode(node)
        }
        // this.pushHistory();
        // this.render();
    }

    getCollidedScene(x: number, y: number): SceneNode | null {
        const flattened = this.flattenScene()

        for (const node of flattened) {
            if (node && node.isCollide(x, y)) {
                return node
            }
        }
        return null
    }

    flattenScene(): SceneNode[] {
        const flattened: SceneNode[] = []

        const traverse = (node: SceneNode) => {
            flattened.push(node)
            node.children.forEach(child => traverse(child))
        }

        this.scene.children.forEach(child => traverse(child))
        return flattened
    }

    draw(skCnvs: Canvas) {
        this.scene.draw(skCnvs)
        this.shapeModifier.draw(skCnvs)
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        }
    }
}

export default SceneManager
