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
    detachShape(){
        this.shapeModifier.setShape(null)
    }
    update(){
        this.shapeModifier.updateResizerPositions()
    }
    setHoveredShape(shape: IShape) {

    }
    draw(canvas:Canvas) {
        this.shapeModifier.draw(canvas)
    }
    hasShape() {

    }
    // Additional methods: move, resize, updateBorderRadius, etc.
}

export default ModifierManager;
