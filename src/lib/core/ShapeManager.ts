
import { useSceneStore } from '@hooks/sceneStore'
import { Coord, Properties } from '@lib/types/shapes'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import throttle from '@lib/helper/throttle'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import ShapeNode from '@lib/node/ShapeNode'
import HistoryManager, { UpdateShapeAction } from './HistoryManager'
import EngineStateStore from './EngineStateStore'

class ShapeManager {
    private scene: SceneNode | null = null
    private shapeModifier: ShapeModifier | null
    private throttledUpdate: (properties: Properties) => void
    private initialProps: Properties | null = null

    constructor(shapeModifier: ShapeModifier) {
        this.scene = null
        this.shapeModifier = shapeModifier
        
        this.throttledUpdate = throttle(useSceneStore.getState().setCurrentShapeProperties as any)
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        this.scene.drawOnDrag(dragStart, e)

        this.shapeModifier?.update()
        const props = this.scene.getProperties()
        if (props) this.throttledUpdate(props)
    }

    handleMouseDown(dragStart: Coord, e: MouseEvent) {
        if (this.scene) {
            this.initialProps = structuredClone(this.scene.getProperties())
        }
        this.shapeModifier?.handleMouseDown(dragStart, e)
    }

    drag(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        if (this.shapeModifier?.hasSelectedHandle()) {
            this.shapeModifier?.dragHandle(dragStart, e)
        } else {
            this.shapeModifier?.dragShape(dragStart, e)
        }

        this.shapeModifier?.update()
        const props = this.scene.getProperties()
        if (props) this.throttledUpdate(props)
    }

    moveScene(dx: number, dy: number) {
        if (!this.scene) return
        this.scene.move(dx, dy)

        this.shapeModifier?.update()
        const props = this.scene.getProperties()
        if (props) this.throttledUpdate(props)
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

        this.shapeModifier?.handleRemoveModiferHandle()
        this.shapeModifier?.update()
        
        const finalProps = this.scene.getProperties()
        if (finalProps) this.throttledUpdate(finalProps)

        // Record history
        if (this.initialProps && this.scene instanceof ShapeNode && this.scene.shape) {
            const shapeId = this.scene.shape.data.id
            const hasChanged = JSON.stringify(this.initialProps) !== JSON.stringify(finalProps)
            
            if (hasChanged) {
                HistoryManager.getInstance().pushAction(
                    new UpdateShapeAction(shapeId, this.initialProps, structuredClone(finalProps))
                )
            }
        }
        //remeber this line
        EngineStateStore.getInstance().notify()
        this.initialProps = null
    }

    handleTinyShapes(): void {
        if (!this.scene) return

        const dim = this.scene.getDim()
        if (!dim) return
        
        const { height, width } = dim
        const minSize = 5

        if (width < minSize || height < minSize) {
            this.scene.drawDefault()
            console.log('Shape removed: too small add default size')
        }

        this.shapeModifier?.update()
        const props = this.scene.getProperties()
        if (props) this.throttledUpdate(props)
    }

    get currentScene(): SceneNode | null {
        return this.scene
    }

    hasScene() {
        return this.scene != null
    }

    attachNode(scene: SceneNode) {
        if (!scene) return

        this.scene = scene
        this.shapeModifier?.attachShape(scene)
        
        if (this.scene instanceof ShapeNode && this.scene.shape) {
            useSceneStore.getState().setSelectedShapeId(this.scene.shape.data.id)
        }

        const props = this.scene.getProperties()
        if (props) this.throttledUpdate(props)
    }

    detachShape() {
        console.log('cleaning up')

        this.scene?.cleanUp()
        this.scene = null
        this.shapeModifier?.detachShape()
        useSceneStore.getState().setSelectedShapeId(null)
        useSceneStore.getState().clearProperties()
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.scene) throw new Error('No shape attached')
        
        const oldProps = structuredClone(this.scene.getProperties())
        const newProps = {
            ...oldProps,
            [key]: value,
        }
        
        this.scene.setProperties(newProps as Properties)
        this.shapeModifier?.update()
        
        const finalProps = this.scene.getProperties()
        if (finalProps) this.throttledUpdate(finalProps)

        // Record history for property bar updates
        if (this.scene instanceof ShapeNode && this.scene.shape) {
            HistoryManager.getInstance().pushAction(
                new UpdateShapeAction(this.scene.shape.data.id, oldProps, structuredClone(finalProps))
            )
        }
    }

    updateBorderRadius(value: number, pos?: string) {
        if (!this.scene) return
        const props = this.scene.getProperties()
        if (!props || !props.borderRadius) return

        const newBorderRadius = { ...props.borderRadius }
        const validKeys = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        
        if (newBorderRadius.locked) {
            newBorderRadius['top-left'] = value
            newBorderRadius['top-right'] = value
            newBorderRadius['bottom-left'] = value
            newBorderRadius['bottom-right'] = value
        } else if (pos && validKeys.includes(pos)) {
            (newBorderRadius as Record<string, number | boolean>)[pos] = value
        }

        this.updateProperty('borderRadius', newBorderRadius)
    }

    updateRadiusLock(locked: boolean) {
        if (!this.scene) return
        const props = this.scene.getProperties()
        if (!props || !props.borderRadius) return

        let newBorderRadius
        if (locked) {
            const br = props.borderRadius
            const maxRadius = Math.max(br['top-left'], br['top-right'], br['bottom-left'], br['bottom-right'])
            newBorderRadius = {
                'top-left': maxRadius,
                'top-right': maxRadius,
                'bottom-left': maxRadius,
                'bottom-right': maxRadius,
                locked: true,
            }
        } else {
            newBorderRadius = { ...props.borderRadius, locked: false }
        }

        this.updateProperty('borderRadius', newBorderRadius)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateStyle(key: 'fill' | 'strokeColor', value: any) {
        if (!this.scene) return
        const style = this.scene.getProperties()?.style
        if (!style) return

        const newStyle = { ...style }
        if (key === 'fill') {
            newStyle.fill = value
        } else if (key === 'strokeColor') {
            newStyle.stroke = {
                ...style.stroke,
                color: value.color,
                opacity: value.opacity,
            }
        }

        this.updateProperty('style', newStyle)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSubProperty(section: keyof Properties, key: string, value: any): void {
        if (!this.scene) return
        const props = this.scene.getProperties()
        if (!props) return
        const target = props[section]
        if (!target || typeof target !== 'object') return

        // Handle nested paths like 'stroke.width'
        const keys = key.split('.')
        const newSectionProps = JSON.parse(JSON.stringify(target))
        let current = newSectionProps
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {}
            }
            current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value

        this.updateProperty(section, newSectionProps as Properties[keyof Properties])
    }

    handleHover(x: number, y: number): string | null {
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
            this.shapeModifier?.setHover(false)
        }
    }

    collide(x: number, y: number): boolean {
        if (!this.scene) {
            return false
        }
        const handle = this.shapeModifier?.selectModifier(x, y)

        if (handle) {
            return true
        } else {
            return false
        }
    }
    setSuppressHandles(suppress: boolean) {
        this.shapeModifier?.setSuppressHandles(suppress)
    }
}

export default ShapeManager
