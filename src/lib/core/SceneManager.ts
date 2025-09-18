import { Canvas } from 'canvaskit-wasm'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'

class SceneManager {
    private scene: ContainerNode
    private shapeModifier: ShapeModifier

    constructor(shapeModifier: ShapeModifier) {
        this.scene = new ContainerNode(null, null)
        this.shapeModifier = shapeModifier
        //remember to add a shape created event
    }

    getScene(): SceneNode {
        return this.scene
    }

    getCollidedScene(x: number, y: number): SceneNode | null {
        const flattened = this.flattenScene().reverse() //work on this

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
            if (Object.hasOwn(node, 'children') && 'children' in node && Array.isArray(node.children)) {
                node.children.forEach(child => traverse(child))
            }
        }
        this.scene.children.forEach(child => traverse(child))
        return flattened
    }

    getAllScene(): SceneNode[] {
        const scenes: SceneNode[] = []
        this.scene.children.forEach(child => scenes.push(child))

        return scenes
    }

    getContainerNodeUnderMouse(x: number, y: number): SceneNode {
        const scene = this.getCollidedScene(x, y)

        if (!scene) return this.scene

        if (scene instanceof ContainerNode) {
            return scene
        } else {
            return scene?.getParent()
        }
    }

    draw(skCnvs: Canvas) {
        this.scene.updateWorldMatrix()
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
