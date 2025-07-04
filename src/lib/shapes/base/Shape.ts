// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import { Handle, ModifierPos } from "@/lib/modifiers";
import type { CanvasKit, Paint, Canvas } from "canvaskit-wasm";


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

    getHandles(size: number, color: string | number[]): Handle[] {
        const handles: Handle[] = [];
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'size', color));
        });
        return handles;
    }

    getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {
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

    abstract moveShape(mx: number, my: number): void;
    abstract calculateBoundingRect(): void;
    abstract setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    abstract draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void;

    setPaint(canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
        const fill = (Array.isArray(this.fill)) ? this.fill : canvasKit.parseColorString(this.fill)
        const strokeColor = (Array.isArray(this.strokeColor)) ? this.strokeColor : canvasKit.parseColorString(this.strokeColor)

        paint.setColor(fill);
        paint.setStyle(canvasKit.PaintStyle.Fill);
        paint.setAntiAlias(true);

        strokePaint.setColor(strokeColor);
        strokePaint.setStyle(canvasKit.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(this.strokeWidth);
        strokePaint.setAntiAlias(true);
    }

    setStrokeColor(color: string | number[]): void {
        this.strokeColor = color;
    }
    setStrokeWidth(width: number): void {
        this.strokeWidth = width;
    }
    setFill(color: string | number[]): void {
        this.fill = color;
    }
}
export default Shape;