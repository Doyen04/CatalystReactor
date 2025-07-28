// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore';
import { Coord, IShape, Properties } from '@lib/types/shapes';
import ModifierManager from './ModifierManager';
import Handle from '@lib/modifiers/Handles';

class ShapeManager {
    private shape: IShape | null = null;
    private modifierManager: ModifierManager | null
    private selectedHandle: Handle | null;

    constructor(modifierManager: ModifierManager) {
        this.shape = null
        this.modifierManager = modifierManager
        this.selectedHandle = null
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        this.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)
        const props = this.shape.getProperties();
        this.modifierManager.update()

        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    drag(x: number, y: number, e: MouseEvent) {
        if (this.selectedHandle) {
            this.modifierManager.drag(x, y, e)

        } else {
            this.shape.moveShape(x, y)
            this.modifierManager.update()
        }
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    move(x: number, y: number) {
        this.shape.moveShape(x, y)
        const props = this.shape.getProperties();
        this.modifierManager.update()

        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    handleTinyShapes(): void {
        if (!this.shape) return;

        const { left, top, right, bottom } = this.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        if (width < minSize || height < minSize) {
            this.shape.drawDefault()
            console.log('Shape removed: too small add default size');
        }
        this.modifierManager.update()
    }

    get currentShape(): IShape {
        return this.shape
    }
    get modifierMgr(): ModifierManager {
        return this.modifierManager
    }

    hasShape(): boolean {
        return this.shape != null
    }

    attachShape(shape: IShape) {
        this.shape = shape;
        this.modifierManager.attachShape(shape)
        // Optionally sync initial props:
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    detachShape() {
        this.shape = null
        this.modifierManager.detachShape()
        useSceneStore.getState().clearProperties()
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.shape) throw new Error("No shape attached");
        const prop = this.shape.getProperties();
        this.shape.setProperties(
            {
                ...prop,
                [key]: value
            }
        );
        this.modifierManager.update()
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }
    finishDrag() {
        this.selectedHandle = null
    }
    collide(x: number, y: number) {
        if (!this.shape) return null;
        const handle = this.modifierManager.getCollidedModifier(x, y)
        if (handle) {
            this.selectedHandle = handle
        }
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager;
