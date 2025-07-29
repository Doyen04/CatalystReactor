// ShapeManager.ts
import { useSceneStore } from '@hooks/sceneStore';
import { Coord, IShape, Properties } from '@lib/types/shapes';
import ShapeModifier from '@lib/modifiers/ShapeModifier';

class ShapeManager {
    private shape: IShape | null = null;
    private shapeModifier: ShapeModifier | null

    constructor(shapeModifier: ShapeModifier) {
        this.shape = null
        this.shapeModifier = shapeModifier
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        this.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)
        const props = this.shape.getProperties();
        this.shapeModifier.update()

        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    drag(x: number, y: number, e: MouseEvent) {
        if (this.shapeModifier.hasSelectedHandle()) {
            this.shapeModifier.drag(x, y, e)

        } else {
            this.shape.moveShape(x, y)
        }
        this.shapeModifier.update()
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    move(x: number, y: number) {
        this.shape.moveShape(x, y)
        const props = this.shape.getProperties();
        this.shapeModifier.update()

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
        this.shapeModifier.update()
    }

    get currentShape(): IShape {
        return this.shape
    }
    get modifierMgr(): ShapeModifier {
        return this.shapeModifier
    }

    hasShape(): boolean {
        return this.shape != null
    }

    attachShape(shape: IShape) {
        this.shape = shape;
        this.shapeModifier.attachShape(shape)
        // Optionally sync initial props:
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }

    detachShape() {
        this.shape = null
        this.shapeModifier.detachShape()
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
        this.shapeModifier.update()
        const props = this.shape.getProperties();
        useSceneStore.getState().setCurrentShapeProperties(props);
    }
    finishDrag() {
        this.shapeModifier.handleRemoveModiferHandle()
        this.shapeModifier.update()
    }
    collide(x: number, y: number) {
        if (!this.shape) return null;
        this.shapeModifier.selectModifier(x, y)
    }

    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ShapeManager;
