// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import type { Handle } from "@/lib/modifiers";
import type { CanvasKit, Paint, Canvas } from "canvaskit-wasm";
type HandleType = "radius" | "size" | "rotate";

// ════════════════════════════════════
abstract class Shape {
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
    getResizeModifersPos(modifierName: string, size: number): { x: number; y: number; } {
        const bRect = this.boundingRect
        size = size / 2
        switch (modifierName) {
            case 'top-left':
                return { x: bRect.left - size, y: bRect.top - size };
            case 'top-right':
                return { x: bRect.right - size, y: bRect.top - size };
            case 'bottom-left':
                return { x: bRect.left - size, y: bRect.bottom - size };
            case 'bottom-right':
                return { x: bRect.right - size, y: bRect.bottom - size };
            default:
                return { x: 0, y: 0 };
        }
    }

    abstract getHandles(size: number, color: string | number[]): Handle[];
    abstract moveShape(mx: number, my: number): void;
    abstract setFill(color: string | number[]): void;
    abstract setStrokeColor(color: string | number[]): void;
    abstract setStrokeWidth(width: number): void;
    abstract calculateBoundingRect(): void;
    abstract getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; };
    abstract setPaint(canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void;
    abstract setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    abstract draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void;
}
export default Shape;