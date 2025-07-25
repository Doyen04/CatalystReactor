// ShapeModifier.ts
import ShapeModifier from '@lib/modifiers/ShapeModifier';
import { Coord, IShape, } from '@lib/types/shapes';
import { Canvas } from 'canvaskit-wasm';

class ModifierManager {
    private hoveredShape: IShape | null = null
    private shapeModifier: ShapeModifier;
    constructor() {
        this.shapeModifier = new ShapeModifier()
        this.hoveredShape = null
    }
    attachShape(shape: IShape) {
        this.shapeModifier.setShape(shape)
    }
    setSelectedShape(shape: IShape) {

    }
    detachShape() {
        this.shapeModifier.setShape(null)
    }
    update() {
        this.shapeModifier.updateResizerPositions()
    }
    setHoveredShape(shape: IShape) {
        if (this.hoveredShape) {
            this.hoveredShape.setHovered(false)
        }
        if (this.shapeModifier.hasShape()) {
            this.shapeModifier.setIsHovered(false)
        }
        if (this.shapeModifier.getShape() == this.hoveredShape) {
            this.shapeModifier.setIsHovered(true)
            return
        }
        this.hoveredShape = shape
        this.hoveredShape.setHovered(true)
    }
    resetHovered() {
        if (this.hoveredShape) {
            this.hoveredShape.setHovered(false)
        }
        this.hoveredShape = null
    }
    draw(canvas: Canvas) {
        if (this.shapeModifier.hasShape()) {
            this.shapeModifier.draw(canvas)
        }
    }
    //tional methods: move, resize, updateBorderRadius, etc.
}

export default ModifierManager;
