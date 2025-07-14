// Handle.ts
import type { Canvas } from "canvaskit-wasm";
import { Oval, Rectangle, Shape } from "@/lib/shapes";
import type { ModifierPos } from './ShapeModifier'

export default class Handle {
    x: number;
    y: number;
    size: number;
    type: HandleType;
    shape: Oval | Rectangle;
    pos: Corner;

    constructor(x: number, y: number, size: number, pos: Corner, type: HandleType, fill: string | number[], stroke: string | number[]) {
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
    updateRadii(dx: number, dy: number, e: MouseEvent, shape: Shape) {
        if (shape instanceof Rectangle) {
            const { left, right, top, bottom } = shape.boundingRect;

            let cornerX, cornerY, distX, distY, newRadius = 0;

            switch (this.pos) {
                case 'top-left':
                    cornerX = left;
                    cornerY = top;
                    distX = e.offsetX - cornerX;
                    distY = e.offsetY - cornerY;
                    if (distX >= 0 && distY >= 0) {
                        newRadius = Math.min(distX, distY);
                    }
                    break;
                case 'top-right':
                    cornerX = right;
                    cornerY = top;
                    distX = e.offsetX - cornerX;
                    distY = e.offsetY - cornerY;
                    if (distX <= 0 && distY >= 0) {
                        newRadius = Math.min(Math.abs(distX), distY);
                    }
                    break;
                case 'bottom-left':
                    cornerX = left;
                    cornerY = bottom;
                    distX = e.offsetX - cornerX;
                    distY = e.offsetY - cornerY;
                    if (distX >= 0 && distY <= 0) {
                        newRadius = Math.min(distX, Math.abs(distY));
                    }
                    break;
                case 'bottom-right':
                    cornerX = right;
                    cornerY = bottom;
                    distX = e.offsetX - cornerX;
                    distY = e.offsetY - cornerY;
                    if (distX <= 0 && distY <= 0) {
                        newRadius = Math.min(Math.abs(distX), Math.abs(distY));
                    }
                    break;
            }

            shape.updateRadius(newRadius, this.pos);
        }
    }

    draw(canvas: Canvas) {
        this.shape.draw(canvas);
    }
}
