// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore'
import { Coord, Properties } from '@lib/types/shapes'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import throttle from '@lib/helper/throttle'
import Handle from '@lib/modifiers/Handles'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'

class ShapeManager {
    private scene: SceneNode | null = null
    private shapeModifier: ShapeModifier | null
    private throttledUpdate: (properties: Properties) => void

    constructor(shapeModifier: ShapeModifier) {
        this.scene = null
        this.shapeModifier = shapeModifier
        this.throttledUpdate = throttle(useSceneStore.getState().setCurrentShapeProperties)
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        this.scene.drawOnDrag(dragStart, e)

        this.shapeModifier.update()
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    handleMouseDown(dragStart: Coord, e: MouseEvent) {
        this.shapeModifier.handleMouseDown(dragStart, e)
    }

    drag(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        if (this.shapeModifier.hasSelectedHandle()) {
            this.shapeModifier.dragHandle(dragStart, e)
        } else {
            this.shapeModifier.dragShape(dragStart, e)
        }

        this.shapeModifier.update()
        const props = this.scene?.getProperties()
        this.throttledUpdate(props)
    }

    moveScene(dx: number, dy: number) {
        this.scene.move(dx, dy)

        this.shapeModifier.update()
        const props = this.scene?.getProperties()
        this.throttledUpdate(props)
    }

    finishDrag() {
        if (!this.scene) return
        const parent = this.scene.getParent()
        if (this.scene instanceof ContainerNode) {
            this.scene.applyLayout()
        }
        if (parent instanceof ContainerNode) {
            parent.applyLayout()
        }

        this.shapeModifier.handleRemoveModiferHandle()

        this.shapeModifier.update()
        const props = this.scene?.getProperties()
        this.throttledUpdate(props)
    }

    handleTinyShapes(): void {
        if (!this.scene) return

        const { height, width } = this.scene.getDim()
        const minSize = 5

        if (width < minSize || height < minSize) {
            this.scene.drawDefault()
            console.log('Shape removed: too small add default size')
        }

        this.shapeModifier.update()
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    get currentScene(): SceneNode {
        return this.scene
    }

    hasScene() {
        return this.scene != null
    }

    attachNode(scene: SceneNode) {
        if (!scene) return

        this.scene = scene
        this.shapeModifier.attachShape(scene)
        // Optionally sync initial props:
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    detachShape() {
        console.log('cleaning up')

        this.scene?.cleanUp()
        this.scene = null
        this.shapeModifier.detachShape()
        useSceneStore.getState().clearProperties()
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.scene) throw new Error('No shape attached')
        const prop = this.scene.getProperties()
        this.scene.setProperties({
            ...prop,
            [key]: value,
        })

        this.shapeModifier.update()
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    handleHover(x: number, y: number): Handle | null {
        if (!this.shapeModifier || !this.scene) return null

        const isCollide = this.shapeModifier.collideRect(x, y)
        if (isCollide) {
            this.shapeModifier.setHover(true)
        } else {
            this.shapeModifier.setHover(false)
        }

        return this.shapeModifier.selectModifier(x, y)
    }

    resetHover(scene: SceneNode | null) {
        if (this.scene !== scene) {
            this.shapeModifier.setHover(false)
        }
    }

    collide(x: number, y: number): boolean {
        if (!this.scene) {
            return false
        }
        const handle = this.shapeModifier.selectModifier(x, y)

        if (handle) {
            return true
        } else {
            return false
        }
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager
