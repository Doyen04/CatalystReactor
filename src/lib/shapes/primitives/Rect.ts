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
    }
    movePos(mx: number, my: number): void {
        // this.x = Math.min(mx , this.x);
        // this.y = Math.min(my , this.y);
    }
    setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        if (shiftKey) {
            this.setSquareSize(dragStart, mx, my);
        } else {
            this.setRectSize(dragStart, mx, my);
        }
    }

    setSquareSize(dragStart: { x: number; y: number; }, mx: number, my: number): void {
        // Calculate dimensions
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        // Use the smaller dimension to create a perfect square
        const dimension = Math.max(Math.abs(deltaX), Math.abs(deltaY));

        this.width = dimension;
        this.height = dimension;

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        // Set position based on drag direction
        this.x = this.isFlippedX ? dragStart.x - dimension : dragStart.x;
        this.y = this.isFlippedY ? dragStart.y - dimension : dragStart.y;

        // Keep original coordinates for property bar
        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        this.boundingRect = {
            top: this.y,
            left: this.x,
            bottom: this.y + dimension,
            right: this.x + dimension
        };
    }

    setRectSize(dragStart: { x: number; y: number; }, mx: number, my: number): void {
        // Calculate dimensions
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        this.width = Math.abs(deltaX);
        this.height = Math.abs(deltaY);

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        // Set position based on drag direction
        this.x = this.isFlippedX ? mx : dragStart.x;
        this.y = this.isFlippedY ? my : dragStart.y;

        // Keep original coordinates for property bar
        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        this.boundingRect = {
            top: this.isFlippedY ? my : dragStart.y,
            left: this.isFlippedX ? mx : dragStart.x,
            bottom: this.isFlippedY ? dragStart.y : my,
            right: this.isFlippedX ? dragStart.x : mx
        };
    }
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
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {

        this.setPaint(canvasKit, paint, strokePaint);

        const rect = canvasKit.LTRBRect(this.x, this.y, this.x + this.width, this.y + this.height);

        canvas.drawRect(rect, paint);
        canvas.drawRect(rect, strokePaint);
    }

    // override _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void {
    //     const rect = canvasKit.LTRBRect(0, 0, this.width, this.height);
    //     sk.drawRect(rect, paint);
    // }
}

export default Rectangle;