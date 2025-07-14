// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import { Handle, ModifierPos } from "@/lib/modifiers";
import { CanvasKitResources } from "@lib/core";
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
    private isHover: boolean;

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
        this.isHover = false;
    }
    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }
    getHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles: Handle[] = [];
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'size', fill, strokeColor));
        });
        return handles;
    }

    getModifersPos(modifierName: string, size: number, handleType: HandleType, isDragging?: boolean): { x: number; y: number; } {
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

    abstract pointInShape(x: number, y: number): boolean;
    abstract moveShape(mx: number, my: number): void;
    abstract calculateBoundingRect(): void;
    abstract setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    abstract draw(canvas: Canvas): void;
    abstract setDim(width: number, height: number): void;
    abstract setCoord(x: number, y: number): void;
    getCoord(): { x: number, y: number } {
        return { x: this.x, y: this.y }
    }

    setPaint(): void {
        if (!this.resource) return
        const cnvsKit = this.resource

        const fill = (Array.isArray(this.fill)) ? this.fill : cnvsKit.canvasKit.parseColorString(this.fill)
        let strokeColor = (Array.isArray(this.strokeColor)) ? this.strokeColor : cnvsKit.canvasKit.parseColorString(this.strokeColor)

        strokeColor = (this.isHover == false) ? strokeColor : cnvsKit.canvasKit.Color(0, 0, 255)

        cnvsKit.paint.setColor(fill);

        cnvsKit.strokePaint.setColor(strokeColor);
        cnvsKit.strokePaint.setStrokeWidth(this.strokeWidth);
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

    setHovered(hvr: boolean) {
        this.isHover = hvr
    }
    abstract destroy(): void;

}
export default Shape;