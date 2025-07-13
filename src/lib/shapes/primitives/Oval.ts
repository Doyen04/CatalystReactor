import { Handle } from "@/lib/modifiers";
import { Shape } from "@/lib/shapes"
import type { Canvas } from "canvaskit-wasm";

class Oval extends Shape {
    private radiusX: number;
    private radiusY: number;

    private isFlippedX: boolean;
    private isFlippedY: boolean;
    private centerX: number;
    private centerY: number;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.radiusX = 0;
        this.radiusY = 0;
        this.isFlippedX = false;
        this.isFlippedY = false;
        this.centerX = 0;
        this.centerY = 0;
        this.calculateBoundingRect();
    }

    override moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
        this.centerX += mx;
        this.centerY += my;
        this.calculateBoundingRect();
    }

    setRadius(radius: number): void {
        this.radiusX = radius;
        this.radiusY = radius;

        this.centerX = this.x + radius
        this.centerY = this.y + radius

        this.calculateBoundingRect()
    }

    override setDim(width: number, height: number) {
        this.radiusX = width / 2;
        this.radiusY = height / 2;

        this.centerX = this.x + this.radiusX
        this.centerY = this.y + this.radiusY

        this.calculateBoundingRect()
    }

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: this.y,
            left: this.x,
            bottom: this.y + this.radiusY * 2,
            right: this.x + this.radiusX * 2
        }
    }

    override setCoord(centerX: number, centerY: number): void {
        this.x = centerX;
        this.y = centerY;

        this.centerX = this.x + this.radiusX
        this.centerY = this.y + this.radiusY

        this.calculateBoundingRect()
    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        if (shiftKey) {
            // Circle mode - use the larger distance for perfect circle
            const radius = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            this.radiusX = radius / 2;
            this.radiusY = radius / 2;

            this.centerX = dragStart.x + (deltaX >= 0 ? this.radiusX : -this.radiusX);
            this.centerY = dragStart.y + (deltaY >= 0 ? this.radiusY : -this.radiusY);

            this.x = deltaX >= 0 ? dragStart.x : dragStart.x - radius;
            this.y = deltaY >= 0 ? dragStart.y : dragStart.y - radius;
        } else {
            // Oval mode
            this.radiusX = Math.abs(deltaX) / 2;
            this.radiusY = Math.abs(deltaY) / 2;

            this.centerX = (dragStart.x + mx) / 2;
            this.centerY = (dragStart.y + my) / 2;

            this.x = deltaX < 0 ? mx : dragStart.x;
            this.y = deltaY < 0 ? my : dragStart.y;
        }

        this.calculateBoundingRect();
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        this.setPaint();

        const rect = this.resource.canvasKit.LTRBRect(this.boundingRect.left, this.boundingRect.top, this.boundingRect.right, this.boundingRect.bottom);

        canvas.drawOval(rect, this.resource.paint);
        canvas.drawOval(rect, this.resource.strokePaint);
    }

    override getHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles = super.getHandles(size, fill, strokeColor);
        return handles;
    }

    override getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {
        return super.getModifersPos(modifierName, size, handleType);
    }

    override pointInShape(x: number, y: number): boolean {
        if (this.radiusX <= 0 || this.radiusY <= 0) {
            return false;
        }

        const dx = x - this.centerX;
        const dy = y - this.centerY;

        // (x-cx)²/rx² + (y-cy)²/ry² <= 1
        const normalizedDistance = (dx * dx) / (this.radiusX * this.radiusX) +
            (dy * dy) / (this.radiusY * this.radiusY);

        return normalizedDistance <= 1;
    }
    override destroy(): void {

    }
}

export default Oval;