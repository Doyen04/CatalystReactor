// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import Handle from "@lib/modifiers/Handles"
import { CanvasKitResources } from "@lib/core/CanvasKitResource";
import { BoundingRect, IShape, Properties, SizeRadiusModifierPos, Style, Transform } from "@lib/types/shapes";
import type { Canvas } from "canvaskit-wasm";


abstract class Shape implements IShape {
    protected transform: Transform;
    protected style: Style;
    boundingRect: BoundingRect;
    private isHover: boolean;

    constructor({ x = 0, y = 0, rotation = 0, scale = 1, fill = "#fff", strokeWidth = 1, strokeColor = '#000' } = {}) {
        if (new.target === Shape) throw new Error("Shape is abstract; extend it!");
        this.transform = { x, y, rotation, scale, anchorPoint: null };
        this.style = { fill, strokeColor, strokeWidth };
        this.boundingRect = { top: 0, left: 0, bottom: 0, right: 0 };
        this.isHover = false;
    }

    abstract getModifierHandles(fill: string | number[], strokeColor: string | number[]): Handle[];
    abstract getModifierHandlesPos(handle: Handle): { x: number; y: number; };
    abstract pointInShape(x: number, y: number): boolean;
    abstract moveShape(mx: number, my: number): void;
    abstract calculateBoundingRect(): void;
    abstract setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    abstract draw(canvas: Canvas): void;
    abstract setDim(width: number, height: number): void;
    abstract getDim(): { width: number, height: number };
    abstract setCoord(x: number, y: number): void;
    abstract getProperties(): Properties;
    abstract setProperties(prop: Properties): void;
    abstract cleanUp(): void;

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }

    getSizeModifierHandles(fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles: Handle[] = [];
        SizeRadiusModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'size', fill, strokeColor));
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

    getCoord(): { x: number, y: number } {
        return { x: this.transform.x, y: this.transform.y }
    }

    drawDefault() {
        const defSize = 100
        this.setDim(defSize, defSize)
        this.setCoord(this.transform.x - (defSize / 2), this.transform.y - (defSize / 2))
    }

    setPaint(): void {
        if (!this.resource) return
        const cnvsKit = this.resource

        const fill = (Array.isArray(this.style.fill)) ? this.style.fill : cnvsKit.canvasKit.parseColorString(this.style.fill)
        let strokeColor = (Array.isArray(this.style.strokeColor)) ? this.style.strokeColor : cnvsKit.canvasKit.parseColorString(this.style.strokeColor)

        strokeColor = (this.isHover == false) ? strokeColor : cnvsKit.canvasKit.Color(0, 0, 255)

        cnvsKit.paint.setColor(fill);

        cnvsKit.strokePaint.setColor(strokeColor);
        cnvsKit.strokePaint.setStrokeWidth(this.style.strokeWidth);
    }

    setStrokeColor(color: string): void {
        this.style.strokeColor = color;
    }
    setStrokeWidth(width: number): void {
        this.style.strokeWidth = width;
    }
    setFill(color: string): void {
        this.style.fill = color;
    }

    setHovered(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHover = bool
    }
    abstract destroy(): void;

}
export default Shape;