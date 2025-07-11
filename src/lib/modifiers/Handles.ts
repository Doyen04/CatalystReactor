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

    constructor(x: number, y: number, size: number, pos: string, type: HandleType, color: string | number[]) {
        this.x = x;
        this.y = y;
        this.pos = pos
        this.size = size;
        this.type = type;

        // By default, use Oval for radius, Rect for size
        if (type === "radius") {
            this.shape = new Oval(x, y);
            this.shape.setRadius(size, size);
            this.shape.setStrokeColor(color)
        } else {
            this.shape = new Rectangle(x, y);
            this.shape.setDim(size, size);
            this.shape.setFill(color);
            this.shape.setStrokeColor(color);
        }
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;

        this.shape.setCoord(x, y);
        
        this.shape.calculateBoundingRect();
    }

    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint) {
        this.shape.draw(canvas, canvasKit, paint, strokePaint);
    }
}
