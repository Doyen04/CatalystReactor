import { Handle } from "@/lib/modifiers";
import { Shape } from "@/lib/shapes"
import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";

type HandleType = "radius" | "size" | "rotate";

class Oval extends Shape {
    radius: number;

    isFlippedX: boolean;
    isFlippedY: boolean;
    centerX: number;
    centerY: number;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.radius = 0;
        this.isFlippedX = false;
        this.isFlippedY = false;
        this.centerX = 0;
        this.centerY = 0;
    }

    moveShape(mx: number, my: number): void {
        this.x = mx;
        this.y = my;
    }

    setRadius(radius: number): void {
        this.radius = radius;
    }

    setFill(color: string | number[]): void {
        this.fill = color;
    }

    setStrokeColor(color: string | number[]): void {
        this.strokeColor = color;
    }

    setStrokeWidth(width: number): void {
        this.strokeWidth = width;
    }

    calculateBoundingRect(): void {
        if (this.centerX !== 0 || this.centerY !== 0) {
            this.x = this.centerX - this.radius;
            this.y = this.centerY - this.radius;

            this.boundingRect = {
                top: this.centerY - this.radius,
                left: this.centerX - this.radius,
                bottom: this.centerY + this.radius,
                right: this.centerX + this.radius
            };
        } else {
            this.boundingRect = {
                top: this.y,
                left: this.x,
                bottom: this.y + this.radius * 2,
                right: this.x + this.radius * 2
            };

            this.centerX = this.x + this.radius;
            this.centerY = this.y + this.radius;
        }
    }

    setCenterPos(centerX: number, centerY: number): void {
        this.centerX = centerX;
        this.centerY = centerY;
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

        // Calculate width and height directly from deltas
        const width = Math.abs(deltaX);
        const height = Math.abs(deltaY);
        this.radius = Math.max(width, height) / 2;

        // Calculate center position directly
        this.centerX = (dragStart.x + mx) / 2;
        this.centerY = (dragStart.y + my) / 2;

        this.boundingRect = {
            top: this.isFlippedY ? my : dragStart.y,
            left: this.isFlippedX ? mx : dragStart.x,
            bottom: this.isFlippedY ? dragStart.y : my,
            right: this.isFlippedX ? dragStart.x : mx
        };
    }

    setSizeCircle(dragStart: { x: number; y: number; }, mx: number, my: number): void {

        const deltaX = Math.abs(mx - dragStart.x);
        const deltaY = Math.abs(my - dragStart.y);
        const radius = Math.max(deltaX, deltaY); // Use the larger distance for perfect circle

        this.radius = radius;
        // Set position to create circle from center outward
        this.x = dragStart.x - radius;
        this.y = dragStart.y - radius;

        this.centerX = dragStart.x;
        this.centerY = dragStart.y;

        this.isFlippedX = false;
        this.isFlippedY = false;
        this.calculateBoundingRect();
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

        const rect = canvasKit.LTRBRect(this.boundingRect.left, this.boundingRect.top, this.boundingRect.right, this.boundingRect.bottom);

        canvas.drawOval(rect, paint);
        canvas.drawOval(rect, strokePaint);
    }

    // override _stroke(sk: Canvas, canvasKit: CanvasKit, paint: Paint): void {
    //     const rect = canvasKit.LTRBRect(0, 0, this.width, this.height);
    //     sk.drawRect(rect, paint);
    // }
    getHandles(size: number, color: string | number[]): Handle[] {
        const handles: Handle[] = [];
        const ModifierPos = [
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right'
        ];
        ModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'size', color));
        });
        return handles;
    }
    getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {
        return this.getResizeModifersPos(modifierName, size);
    }
}

export default Oval;