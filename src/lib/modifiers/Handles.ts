// Handle.ts
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import { Oval, Rectangle } from "@/lib/shapes";

export default class Handle {
    x: number;
    y: number;
    size: number;
    type: HandleType;
    shape: Oval | Rectangle;
    pos: string;

    constructor(x: number, y: number, size: number, pos: string, type: HandleType, fill: string | number[], stroke: string | number[]) {
        this.x = x;
        this.y = y;
        this.pos = pos
        this.size = size;
        this.type = type;

        // By default, use Oval for radius, Rect for size
        if (type === "radius") {
            this.shape = new Oval(x, y);
            this.shape.setRadius(size);
        } else {
            this.shape = new Rectangle(x, y);
            this.shape.setDim(size, size);
        }
        this.shape.setStrokeColor(stroke)
        this.shape.setFill(fill)
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;

        this.shape.setCoord(x, y);

        this.shape.calculateBoundingRect();
    }
    isCollide(x: number, y: number): boolean {
        return this.shape.pointInShape(x, y)
    }
    // move(x: number, y: number) {console.log('dragging start', x, y);
    //     this.shape.moveShape(x, y)
    // }
    draw(canvas: Canvas) {
        this.shape.draw(canvas);
    }
}
