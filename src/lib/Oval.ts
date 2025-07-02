import Shape from './Shape';
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";

class Oval extends Shape {
    radius: number;

    originalX: number;
    originalY: number;
    isFlippedX: boolean;
    isFlippedY: boolean;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.radius = 0;
        this.originalX = x;
        this.originalY = y;
        this.isFlippedX = false;
        this.isFlippedY = false;
    }
    movePos(mx: number, my: number): void {
        // this.x = Math.min(mx , this.x);
        // this.y = Math.min(my , this.y);
    }
    setRadius(radius: number): void {
        this.radius = radius;
    }
    setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        if (shiftKey) {
            this.setSizeCircle(dragStart, mx, my);
        } else {
            this.setSizeOval(dragStart, mx, my);
        }
    }
    setSizeOval(dragStart: { x: number; y: number; }, mx: number, my: number): void {
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        // Set position based on drag direction
        this.x = this.isFlippedX ? mx : dragStart.x;
        this.y = this.isFlippedY ? my : dragStart.y;

        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        this.boundingRect = {
            top: this.isFlippedY ? my : dragStart.y,
            left: this.isFlippedX ? mx : dragStart.x,
            bottom: this.isFlippedY ? dragStart.y : my,
            right: this.isFlippedX ? dragStart.x : mx
        };

        const width = Math.abs(this.boundingRect.right - this.boundingRect.left);
        const height = Math.abs(this.boundingRect.bottom - this.boundingRect.top);
        this.radius = Math.max(width, height) / 2;
    }

    setSizeCircle(dragStart: { x: number; y: number; }, mx: number, my: number): void {
        // Calculate radius from center point (dragStart) to mouse position
        const deltaX = Math.abs(mx - dragStart.x);
        const deltaY = Math.abs(my - dragStart.y);
        const radius = Math.max(deltaX, deltaY); // Use the larger distance for perfect circle

        this.radius = radius;
        // Set position to create circle from center outward
        this.x = dragStart.x - radius;
        this.y = dragStart.y - radius;

        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        this.isFlippedX = false;
        this.isFlippedY = false;

        this.boundingRect = {
            top: dragStart.y - radius,
            left: dragStart.x - radius,
            bottom: dragStart.y + radius,
            right: dragStart.x + radius
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

        const rect = canvasKit.LTRBRect(this.boundingRect.left, this.boundingRect.top, this.boundingRect.right, this.boundingRect.bottom);

        canvas.drawOval(rect, paint);
        canvas.drawOval(rect, strokePaint);
    }

    // override _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void {
    //     const rect = canvasKit.LTRBRect(0, 0, this.width, this.height);
    //     sk.drawRect(rect, paint);
    // }
}

export default Oval;