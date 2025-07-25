// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore';
import ShapeModifier from '@lib/modifiers/ShapeModifier';
import { Coord, IShape, Properties } from '@lib/types/shapes';

class ShapeManager {
    private shape: IShape | null = null;

    constructor() {
        this.shape = null
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        this.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)
        const props = this.shape.getProperties();
        
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    dragShape(x: number, y: number) {
        this.shape.moveShape(x, y)
        const props = this.shape.getProperties();
        
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
    }

    get currentShape(): IShape {
        return this.shape
    }

    attachShape(shape: IShape) {
        this.shape = shape;
        // Optionally sync initial props:
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    detachShape() {
        this.shape = null
    }

    updateProperty<K extends keyof Properties>(key: K, value: Properties[K]) {
        if (!this.shape) throw new Error("No shape attached");
        this.shape.setProperties({ [key]: value } as any);
        const final = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(final);
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager;
