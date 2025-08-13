// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore';
import { Coord, IShape, Properties } from '@lib/types/shapes';
import ShapeModifier from '@lib/modifiers/ShapeModifier';
import throttle from '@lib/helper/throttle';
import SceneNode from './SceneGraph';

class ShapeManager {
    private scene: SceneNode | null = null;
    private shapeModifier: ShapeModifier | null
    private throttledUpdate: (properties: Properties) => void;
    private selected: boolean = false;

    constructor(shapeModifier: ShapeModifier) {
        this.scene = null
        this.shapeModifier = shapeModifier
        this.throttledUpdate = throttle(useSceneStore.getState().setCurrentShapeProperties)
    }


    drawShape(dragStart: Coord, e: MouseEvent) {
        this.scene.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)

        this.shapeModifier.update()

        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
        // useSceneStore.getState().setCurrentShapeProperties(props);
    }

    drag(x: number, y: number, e: MouseEvent) {
        if (this.shapeModifier.hasSelectedHandle()) {
            this.shapeModifier.drag(x, y, e)

        } else {
            this.scene.shape.moveShape(x, y)
        }
        this.shapeModifier.update()
        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
    }

    move(x: number, y: number) {
        this.scene.shape.moveShape(x, y)
        this.shapeModifier.update()

        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
    }

    handleTinyShapes(): void {
        if (!this.scene) return;

        const { left, top, right, bottom } = this.scene.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        if (width < minSize || height < minSize) {
            this.scene.shape.drawDefault()
            console.log('Shape removed: too small add default size');
        }
        
        this.shapeModifier.update()
        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
    }

    get currentShape(): IShape {
        return this.scene.shape
    }
    get currentScene(): SceneNode {
        return this.scene
    }
    get modifierMgr(): ShapeModifier {
        return this.shapeModifier
    }

    hasShape(): boolean {
        return this.scene.shape != null
    }

    hasSelection(): boolean {
        return this.selected
    }

    attachNode(scene: SceneNode) {
        this.scene = scene;
        this.shapeModifier.attachShape(scene.shape);
        // Optionally sync initial props:
        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
    }

    detachShape() {
        this.scene = null
        this.shapeModifier.detachShape()
        useSceneStore.getState().clearProperties()
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.scene.shape) throw new Error("No shape attached");
        const prop = this.scene.shape.getProperties();
        this.scene.shape.setProperties(
            {
                ...prop,
                [key]: value
            }
        );
        this.shapeModifier.update()
        const props = this.scene.shape.getProperties();
        this.throttledUpdate(props)
    }

    finishDrag() {
        if (!this.scene.shape) return;
        this.selected = false;
        this.shapeModifier.handleRemoveModiferHandle()
        this.shapeModifier.update()
    }

    collide(x: number, y: number): boolean {
        if (!this.scene.shape) {
            this.selected = false;
            return false;
        }

        const handle = this.shapeModifier.selectModifier(x, y)
        if (handle) {
            this.selected = true
            return true
        }
        this.selected = this.scene.shape.pointInShape(x, y) ? true : false
        return this.selected
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager;
