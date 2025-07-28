// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore';
import { Coord, IShape, Properties } from '@lib/types/shapes';
import ModifierManager from './ModifierManager';

class ShapeManager {
    private shape: IShape | null = null;
    private modifierManager: ModifierManager | null

    constructor(modifierManager: ModifierManager) {
        this.shape = null
        this.modifierManager = modifierManager
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        this.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)
        const props = this.shape.getProperties();
        this.modifierManager.update()

        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    dragShape(x: number, y: number) {
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
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager;
