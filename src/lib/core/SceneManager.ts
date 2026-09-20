import type { Canvas, Image as CanvasKitImage } from 'canvaskit-wasm'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import ShapeNode from '@lib/node/ShapeNode'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import ShapeManager from './ShapeManager'
import EngineStateStore from './EngineStateStore'
import type { Coord, ShapeType } from '@lib/types/shapes'
import type { EntityId } from '@/engine/document/entity'
import type { DocumentModel } from '@/engine/document/DocumentModel'

class SceneManager {
    private doc: DocumentModel
    private scene: ContainerNode
    private shapeModifier: ShapeModifier
    private shapeManager: ShapeManager
    private nodeById = new Map<EntityId, SceneNode>()
    private unsubscribe: (() => void) | null = null

    constructor(shapeModifier: ShapeModifier, shapeManager: ShapeManager, doc: DocumentModel) {
        this.doc = doc
        this.scene = new ContainerNode(null, null)
        this.shapeModifier = shapeModifier
        this.shapeManager = shapeManager
        this.unsubscribe = doc.subscribeJournal(entry => {
            if (entry.kind !== 'props') this.sync()
        })
    }

    addShapeToScene(type: ShapeType, pos: Coord, image?: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer; name: string }): SceneNode {
        const shape = ShapeFactory.createShape(type, pos, image)

        const existing = this.nodeById.get(shape.data.id)
        if (existing) {
            existing.destroy()
            this.nodeById.delete(shape.data.id)
        }

        const node = type === 'plainRect' ? new ContainerNode(shape, { type: 'none' }) : new ShapeNode(shape)
        this.nodeById.set(shape.data.id, node)

        this.sync()
        return node
    }

    insertNode(node: SceneNode, parentId: EntityId, index?: number): void {
        const childCount = this.doc.childrenOf(parentId).length
        const at = index === undefined || index === -1 ? childCount : Math.min(Math.max(index, 0), childCount)
        this.doc.reparent(node.id, parentId, at)
        this.sync()
    }

    removeNode(id: EntityId): void {
        this.doc.remove(id)
        this.sync()
    }

    reorderNode(id: EntityId, index: number): void {
        this.doc.reorder(id, index)
        this.sync()
    }

    getNode(id: EntityId): SceneNode | undefined {
        return this.nodeById.get(id)
    }

    private sync(): void {
        const currentIds = new Set<EntityId>()
        for (const record of this.doc.all()) {
            currentIds.add(record.id)
            if (this.nodeById.has(record.id)) continue

            const data = EngineStateStore.getInstance().getShapeData(record.id)
            if (!data) continue
            const shape = ShapeFactory.createShapeFromData(data)
            const node = record.type === 'plainRect' ? new ContainerNode(shape, { type: 'none' }) : new ShapeNode(shape)
            this.nodeById.set(record.id, node)
        }

        for (const parentId of [...currentIds, this.doc.rootId]) {
            const parentNode = parentId === this.doc.rootId ? this.scene : this.nodeById.get(parentId)
            if (!(parentNode instanceof ContainerNode)) continue

            const childNodes: SceneNode[] = []
            for (const childId of this.doc.childrenOf(parentId)) {
                const child = this.nodeById.get(childId)
                if (child) childNodes.push(child)
            }

            const changed = parentNode.children.length !== childNodes.length || childNodes.some((child, i) => parentNode.children[i] !== child)

            if (changed) {
                parentNode.children = childNodes
                for (const child of childNodes) child.setParent(parentNode)
                parentNode.applyLayout()
            }
        }

        for (const [id, node] of this.nodeById) {
            if (currentIds.has(id)) continue
            if (node instanceof ContainerNode) node.children = []
            node.destroy()
            this.nodeById.delete(id)
        }
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
        this.unsubscribe?.()
        this.unsubscribe = null
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        }
        this.nodeById.clear()
    }
}

export default SceneManager
