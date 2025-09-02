// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore'
import { Coord, Properties } from '@lib/types/shapes'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import throttle from '@lib/helper/throttle'
import Handle from '@lib/modifiers/Handles'
import SceneNode from '@lib/node/Scene'
import { Canvas } from 'canvaskit-wasm'

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
        this.scene.drawOnDrag(dragStart, e)
        this.shapeModifier.updateResizerPositions(this.scene)

        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    handleMouseDown(dragStart: Coord, e: MouseEvent) {
        this.shapeModifier.handleMouseDown(dragStart, e, this.scene)
        console.log('not used', dragStart, e)
    }

    drag(dragStart: Coord, dx: number, dy: number, e: MouseEvent) {
        if (this.shapeModifier.hasSelectedHandle()) {
            this.shapeModifier.drag(dragStart, dx, dy, e, this.scene)
        } else {
            console.log('before-dragging', this.scene.getCoord());
            this.scene.move(dx, dy)
            console.log('after-dragging', this.scene.getCoord());
        }

        this.shapeModifier.updateResizerPositions(this.scene)
        const props = this.scene.getProperties()
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

        this.shapeModifier.updateResizerPositions(this.scene)
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    get currentScene(): SceneNode {
        return this.scene
    }

    hasSelection(): boolean {
        return this.selected
    }

    attachNode(scene: SceneNode) {
        this.scene = scene
        this.shapeModifier.setUpHandles(scene)
        this.selected = true
        // Optionally sync initial props:
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    detachShape() {
        this.scene = null
        useSceneStore.getState().clearProperties()
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.scene) throw new Error('No shape attached')
        const prop = this.scene.getProperties()
        this.scene.setProperties({
            ...prop,
            [key]: value,
        })
        this.shapeModifier.updateResizerPositions(this.scene)
        const props = this.scene.getProperties()
        this.throttledUpdate(props)
    }

    handleHover(x: number, y: number): Handle | null {
        if (!this.shapeModifier || !this.scene) return null

        const isCollide = this.shapeModifier.collideRect(x, y, this.scene)
        if (isCollide) {
            this.shapeModifier.setHover(true)
        } else {
            this.shapeModifier.setHover(false)
        }

        return this.shapeModifier.selectModifierHandles(x, y, this.scene)
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
        this.shapeModifier.updateResizerPositions(this.scene)
    }

    collide(x: number, y: number): boolean {
        if (!this.scene) {
            this.selected = false
            return false
        }

        const handle = this.shapeModifier.selectModifierHandles(x, y, this.scene)
        console.log('selected handle:', handle)

        if (handle) {
            this.selected = true
            return true
        }
        this.selected = this.scene.pointInShape(x, y) ? true : false
        return this.selected
    }

    draw(skCnvs: Canvas) {
        this.shapeModifier.draw(skCnvs, this.scene)
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager
