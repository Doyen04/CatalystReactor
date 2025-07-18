import type { Canvas } from "canvaskit-wasm";
import Rectangle from './Rect';

class PImage extends Rectangle {


    constructor(x: number, y: number) {
        super(x, y);
        this.width = 0;
        this.height = 0;
        this.bdradius = {
            'top-left': 0,
            'top-right': 0,
            'bottom-left': 0,
            'bottom-right': 0,
            locked: false,
        };
        this.originalX = x;
        this.originalY = y;
        this.isFlippedX = false;
        this.isFlippedY = false;
        this.calculateBoundingRect()
    }


    override draw(canvas: Canvas): void {
        if (!this.resource) return;


    }

    override destroy(): void {

    }
}

export default PImage;