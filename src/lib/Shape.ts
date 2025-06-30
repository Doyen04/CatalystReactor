// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import type { CanvasKit, Paint, Canvas } from "canvaskit-wasm";

// ════════════════════════════════════
class Shape {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    fill: string;
    stroke: string;
    lineWidth: number;

    constructor({ x = 0, y = 0, rotation = 0, scale = 1, fill = "#fff", stroke = '#000', lineWidth = 1 } = {}) {
        if (new.target === Shape) throw new Error("Shape is abstract; extend it!");
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.scale = scale;
        this.fill = fill;
        this.stroke = stroke;
        this.lineWidth = lineWidth;
    }

    // Draw wrapper handling transform & style
    draw(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void {
        sk.save();

        // Create transformation matrix
        const T = canvasKit.Matrix.translated(this.x, this.y);
        const R = canvasKit.Matrix.rotated(this.rotation, this.x, this.y);
        const S = canvasKit.Matrix.scaled(this.scale, this.scale, this.x, this.y);


        const matrix = canvasKit.Matrix.multiply(T, R, S);

        // Apply the matrix transformation
        sk.concat(matrix);

        // Set paint properties
        if (this.fill) {
            paint.setColor(canvasKit.parseColorString(this.fill));
            paint.setStyle(canvasKit.PaintStyle.Fill);
            this._fill(sk, canvasKit, paint);
        }
        if (this.stroke) {
            paint.setColor(canvasKit.parseColorString(this.stroke));
            paint.setStyle(canvasKit.PaintStyle.Stroke);
            paint.setStrokeWidth(this.lineWidth);
            this._stroke(sk, canvasKit, paint);
        }
        sk.restore();
    }

    _fill(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
    _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
}
export default Shape;