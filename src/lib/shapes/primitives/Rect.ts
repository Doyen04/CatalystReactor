import { Handle } from '@/lib/modifiers';
import { Shape } from '@/lib/shapes';
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";

type HandleType = "radius" | "size" | "rotate";

class Rectangle extends Shape {
    width: number;
    height: number;
    bdradius: number;

    originalX: number;
    originalY: number;
    isFlippedX: boolean;
    isFlippedY: boolean;

    constructor(x: number, y: number, { bdradius = 0, ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.width = 0;
        this.height = 0;
        this.bdradius = bdradius;
        this.originalX = x;
        this.originalY = y;
        this.isFlippedX = false;
        this.isFlippedY = false;
    }

    override moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
        this.originalX += mx;
        this.originalY += my;
        this.calculateBoundingRect();
    }

    getRadiusModifiersPos(modifierName: string): { x: number; y: number; } {
        const bRect = this.boundingRect
        const ModPadding = this.bdradius + 10

        switch (modifierName) {
            case 'top-left':
                return { x: bRect.left + ModPadding, y: bRect.top + ModPadding };
            case 'top-right':
                return { x: bRect.right - ModPadding, y: bRect.top + ModPadding };
            case 'bottom-left':
                return { x: bRect.left + ModPadding, y: bRect.bottom - ModPadding };
            case 'bottom-right':
                return { x: bRect.right - ModPadding, y: bRect.bottom - ModPadding };
            default:
                return { x: 0, y: 0 };
        }
    }
    getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {
        
        if (handleType === 'radius') {
            return this.getRadiusModifiersPos(modifierName);
            
        } else if (handleType === 'size') {
            return this.getResizeModifersPos(modifierName, size);
        }
        return { x: 0, y: 0 };
    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        this.x = Math.min(dragStart.x, mx);
        this.y = Math.min(dragStart.y, my);

        if (shiftKey) {
            this.setSquareSize(deltaX, deltaY);
        } else {
            this.setRectSize(deltaX, deltaY);
        }
        this.calculateBoundingRect();
    }

    setCoord(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    setDim(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: this.y,
            left: this.x,
            bottom: this.y + this.height,
            right: this.x + this.width
        };

        // Update original coordinates for property bar
        this.originalX = this.x;
        this.originalY = this.y;
    }

    setSquareSize(deltaX: number, deltaY: number): void {
        const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        this.width = size;
        this.height = size;

        this.x = Math.min(this.originalX, this.originalX + size);
        this.y = Math.min(this.originalY, this.originalY + size);
    }

    setRectSize(deltaX: number, deltaY: number): void {
        this.width = Math.abs(deltaX);
        this.height = Math.abs(deltaY);
    }

    override setPaint(canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
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

    override draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {

        this.setPaint(canvasKit, paint, strokePaint);

        const rect = canvasKit.LTRBRect(this.x, this.y, this.x + this.width, this.y + this.height);

        canvas.drawRect(rect, paint);
        canvas.drawRect(rect, strokePaint);
    }

    override setStrokeColor(color: string | number[]): void {
        this.strokeColor = color;
    }
    override setStrokeWidth(width: number): void {
        this.strokeWidth = width;
    }
    override setFill(color: string | number[]): void {
        this.fill = color;
    }

    getHandles(size: number, color: string | number[]): Handle[] {
        const handles: Handle[] = [];
        const ModifierPos = [
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right'
        ]
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'size', color))
        })
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'radius', color))
        })
        return handles;
    }
}

export default Rectangle;