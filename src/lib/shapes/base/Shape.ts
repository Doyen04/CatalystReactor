// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import Handle from "@lib/modifiers/Handles"
import { SizeRadiusModifierPos } from "@/lib/modifiers/ShapeModifier";
import { CanvasKitResources } from "@lib/core/CanvasKitResource";
import { BoundingRect, IShape } from "@lib/types/shapes";
import type { Canvas } from "canvaskit-wasm";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";

const { Render } = EventTypes

abstract class Shape implements IShape {
    protected x: number;
    protected y: number;
    rotation: number;
    scale: number;
    fill: string | number[];
    strokeWidth: number;
    strokeColor: string | number[];
    boundingRect: BoundingRect;
    private isHover: boolean;
    anchorPoint: number;

    constructor({ x = 0, y = 0, rotation = 0, scale = 1, fill = "#fff", strokeWidth = 1, strokeColor = '#000' } = {}) {
        if (new.target === Shape) throw new Error("Shape is abstract; extend it!");
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.scale = scale;
        this.fill = fill;
        this.anchorPoint = null
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

    getSizeModifierHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles: Handle[] = [];
        SizeRadiusModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'size', fill, strokeColor));
        });
        return handles;
    }

    getSizeModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const bRect = this.boundingRect
        const size = handle.size / 2
        switch (handle.pos) {
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

    abstract getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[];
    abstract getModifierHandlesPos(handle: Handle): { x: number; y: number; };
    abstract pointInShape(x: number, y: number): boolean;
    abstract moveShape(mx: number, my: number): void;
    abstract calculateBoundingRect(): void;
    abstract setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    abstract draw(canvas: Canvas): void;
    abstract setDim(width: number, height: number): void;
    abstract getDim(): { width: number, height: number };
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

    setHovered(bool: boolean) {
        EventQueue.trigger(Render)
        this.isHover = bool
    }
    abstract destroy(): void;

}
export default Shape;