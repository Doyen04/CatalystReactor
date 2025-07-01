import Shape from './Shape';
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";

class Rectangle extends Shape {
    width: number;
    height: number;
    bdradius: number;

    constructor(x: number, y: number, { bdradius = 0, ...shapeProps } = {}) {
        super({x, y, ...shapeProps});
        this.width = 0;
        this.height = 0;
        this.bdradius = bdradius;
    }
    setSize(mx: number, my: number): void {
        this.width = Math.abs(mx - this.x);
        this.height = Math.abs(my - this.y);
    }

    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint) {
        const rect = canvasKit.LTRBRect(this.x, this.y, this.x + this.width, this.y + this.height);
        canvas.drawRect(rect, paint);
    }

    // override _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void {
    //     const rect = canvasKit.LTRBRect(0, 0, this.width, this.height);
    //     sk.drawRect(rect, paint);
    // }
}

export default Rectangle;