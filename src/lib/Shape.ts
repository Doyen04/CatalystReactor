// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import type { CanvasKit, Paint, Canvas } from "canvaskit-wasm";

// ════════════════════════════════════
class Shape {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    fill: string | number[];
    strokeWidth: number;
    strokeColor: string | number[];
    boundingRect: { top: number, left: number, bottom: number, right: number };

    constructor({ x = 0, y = 0, rotation = 0, scale = 1, fill = "#fff", strokeWidth = 1, strokeColor = '#000' } = {}) {
        if (new.target === Shape) throw new Error("Shape is abstract; extend it!");
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.scale = scale;
        this.fill = fill;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.boundingRect = { top: 0, left: 0, bottom: 0, right: 0 };
    }

    _setFill(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
    _setStroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void { /* no-op */ }
    setPaint(canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {}
    setSize(dragStart: {x: number, y: number}, mx: number, my: number): void {}
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {}
}
export default Shape;