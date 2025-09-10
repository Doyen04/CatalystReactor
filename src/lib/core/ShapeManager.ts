// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore'
import { Coord, Properties } from '@lib/types/shapes'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import throttle from '@lib/helper/throttle'
import Handle from '@lib/modifiers/Handles'
import SceneNode from '@lib/node/Scene'

class ShapeManager {
    private scene: SceneNode | null = null
    private shapeModifier: ShapeModifier | null
    private throttledUpdate: (properties: Properties) => void
    private selected: boolean = false

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
        console.log('not used', dragStart, e)
    }

    drag(dragStart: Coord, dx: number, dy: number, e: MouseEvent) {
        if (this.shapeModifier.hasSelectedHandle()) {
            this.shapeModifier.drag(dragStart, dx, dy, e)
        } else {
            this.scene.move(dx, dy)
        }

        this.shapeModifier.update()
        const props = this.scene?.getProperties()
        this.throttledUpdate(props)
    }
    moveScene(dx: number, dy: number) {
        this.scene.move(dx, dy)
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

    hasSelection(): boolean {
        return this.selected
    }

    attachNode(scene: SceneNode) {
        if (!scene) return 
        
        this.scene = scene
        this.shapeModifier.attachShape(scene)
        this.selected = true
        // Optionally sync initial props:
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    detachShape() {
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

    finishDrag() {
        if (!this.scene) return
        this.selected = false
        this.shapeModifier.handleRemoveModiferHandle()
        this.shapeModifier.update()
    }

    collide(x: number, y: number): boolean {
        if (!this.scene) {
            this.selected = false
            return false
        }

        const handle = this.shapeModifier.selectModifier(x, y)
        console.log('selected handle:', handle)

        if (handle) {
            this.selected = true
            return true
        }
        this.selected = this.scene.isCollide(x, y) ? true : false
        return this.selected
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager
