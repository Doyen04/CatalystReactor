import type { Canvas } from 'canvaskit-wasm'
import container from '@lib/core/DependencyManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'

import ShapeNode from '@lib/node/ShapeNode'
import ShapeManager from './ShapeManager'

class SceneManager {
    private scene: ContainerNode
    private shapeModifier: ShapeModifier
    private shapeManager: ShapeManager

    constructor(shapeModifier: ShapeModifier, shapeManager: ShapeManager) {
        this.scene = new ContainerNode(null, null)
        this.shapeModifier = shapeModifier
        this.shapeManager = shapeManager
    }

    getScene(): SceneNode {
        return this.scene
    }

    getCollidedScene(x: number, y: number, deep: boolean = false): SceneNode | null {
        const root = this.scene
        
        const findDeepest = (node: SceneNode): SceneNode | null => {
            if (!node || !node.isCollide(x, y)) return null
            
            const children = node.getChildren()
            // Search children back to front (top to bottom in z-order)
            for (let i = children.length - 1; i >= 0; i--) {
                const hit = findDeepest(children[i])
                if (hit) return hit
            }
            
            return node // If no children hit, this is the deepest leaf
        }

        const findTopLevel = (node: SceneNode): SceneNode | null => {
            const children = node.getChildren()
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].isCollide(x, y)) return children[i]
            }
            return null
        }

        return deep ? findDeepest(root) : findTopLevel(root)
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

    getAllContainerNode() {
        const scenes: SceneNode[] = []
        this.scene.children.forEach(node => {
            if (Object.hasOwn(node, 'children') && 'children' in node && Array.isArray(node.children)) {
                scenes.push(node)
            }
        })
        return scenes
    }

    getRootContainer() {
        return this.scene
    }

    getContainerNodeUnderMouse(x: number, y: number): SceneNode {
        const flattened = this.getAllContainerNode().reverse() //work on this

        for (const node of flattened) {
            if (node && node.isCollide(x, y)) {
                return node
            }
        }
        return null
    }

    draw(skCnvs: Canvas) {
        this.scene.updateWorldMatrix()
        this.scene.draw(skCnvs)
        this.shapeManager.draw(skCnvs)
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        }
    }
}

export default SceneManager
