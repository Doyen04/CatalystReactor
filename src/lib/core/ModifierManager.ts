// ShapeModifier.ts
import Handle from '@lib/modifiers/Handles';
import ShapeModifier from '@lib/modifiers/ShapeModifier';
import { IShape, } from '@lib/types/shapes';
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
    getCollidedModifier(x: number, y: number): Handle {
        return this.shapeModifier.selectModifier(x, y)
    }

    detachShape() {
        this.shapeModifier.setShape(null)
    }
    drag(x: number, y: number, e: MouseEvent) {
        this.shapeModifier.handleModifierDrag(x, y, e)
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
        if (this.shapeModifier.hasShape()) {
            this.shapeModifier.setIsHovered(false)
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
