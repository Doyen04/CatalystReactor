import { Handle, ModifierPos } from '@/lib/modifiers';
import { Shape } from '@/lib/shapes';
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";


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
        this.calculateBoundingRect()
    }

    override moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
        this.originalX += mx;
        this.originalY += my;
        this.calculateBoundingRect();
    }


    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        if (shiftKey) {
            const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            this.width = size;
            this.height = size;

            if (deltaX >= 0) {
                this.x = this.originalX;
            } else {
                this.x = this.originalX - size;
            }

            if (deltaY >= 0) {
                this.y = this.originalY;
            } else {
                this.y = this.originalY - size;
            }
        } else {
            this.width = Math.abs(deltaX);
            this.height = Math.abs(deltaY);
            this.x = Math.min(dragStart.x, mx);
            this.y = Math.min(dragStart.y, my);
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
    }


    override draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {

        this.setPaint(canvasKit, paint, strokePaint);

        const rect = canvasKit.LTRBRect(this.x, this.y, this.x + this.width, this.y + this.height);

        canvas.drawRect(rect, paint);
        canvas.drawRect(rect, strokePaint);
    }

    getHandles(size: number, color: string | number[]): Handle[] {
        const handles = super.getHandles(size, color);
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'radius', color))
        })
        return handles;
    }

    getRadiusModifiersPos(modifierName: string, size: number): { x: number; y: number; } {
        const bRect = this.boundingRect
        const ModPadding = (this.bdradius + 10)

        switch (modifierName) {
            case 'top-left':
                return { x: (bRect.left + ModPadding) - size, y: (bRect.top + ModPadding) - size };
            case 'top-right':
                return { x: (bRect.right - ModPadding) - size, y: (bRect.top + ModPadding) - size };
            case 'bottom-left':
                return { x: (bRect.left + ModPadding) - size, y: (bRect.bottom - ModPadding) - size };
            case 'bottom-right':
                return { x: (bRect.right - ModPadding) - size, y: (bRect.bottom - ModPadding) - size };
            default:
                return { x: 0, y: 0 };
        }
    }

    override getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {

        if (handleType === 'radius') {
            return this.getRadiusModifiersPos(modifierName, size);
        } else if (handleType === 'size') {
            return super.getModifersPos(modifierName, size, handleType);
        }
        return { x: 0, y: 0 };
    }

    override pointInShape(x: number, y: number): boolean {
        return x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height;
    }
}

export default Rectangle;