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

    _fill(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
    _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
    setSize(mx: number, my: number): void {}
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint): void {}
}
export default Shape;