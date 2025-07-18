import Handle from "@/lib/modifiers/Handles";
import Shape from "../base/Shape"
import type { Canvas, Path, Rect } from "canvaskit-wasm";
import { Corner, HandleType, Point } from "@lib/types/shapes";

class Oval extends Shape {
    private radiusX: number;
    private radiusY: number;
    private ratio: number;

    private isFlippedX: boolean;
    private isFlippedY: boolean;
    private centerX: number;
    private centerY: number;
    private startAngle: number = 0;
    private endAngle: number = 2 * Math.PI;


    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.radiusX = 0;
        this.radiusY = 0;
        this.ratio = 0;
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

    override getDim(): { width: number, height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    isTorus(): boolean {
        return this.ratio > 0;
    }

    setRatio(nx: number) {
        this.ratio = nx
    }

    setArc(startAngle: number, endAngle: number) {
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    isArc(): boolean {
        return Math.abs(this.endAngle - this.startAngle) < 2 * Math.PI;
    }

    getArcAngles(): { start: number, end: number } {
        return { start: this.startAngle, end: this.endAngle };
    }

    getCenterCoord(): { x: number, y: number } {
        return { x: this.centerX, y: this.centerY }
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
        if (this.isTorus() || this.isArc()) {
            // Draw torus using path
            this.drawComplexShape(canvas, rect);
        } else {

            canvas.drawOval(rect, this.resource.paint);
            canvas.drawOval(rect, this.resource.strokePaint);
        }
    }

    private drawComplexShape(canvas: Canvas, rect: Rect) {
        const { canvasKit } = this.resource;
        const path = new canvasKit.Path();

        const innerRect = canvasKit.LTRBRect(
            this.centerX - this.radiusX * this.ratio,
            this.centerY - this.radiusY * this.ratio,
            this.centerX + this.radiusX * this.ratio,
            this.centerY + this.radiusY * this.ratio
        );
        const startDegrees = this.startAngle * 180 / Math.PI;
        const sweepDegrees = (this.endAngle - this.startAngle) * 180 / Math.PI;

        if (this.isTorus() && !this.isArc()) {
            this.drawTorus(rect, innerRect, path)
        } else if (this.isArc() && !this.isTorus()) {
            this.drawArc(rect, path, startDegrees, sweepDegrees);
        } else {
            this.drawComplexTorusArc(rect, innerRect, path, startDegrees, sweepDegrees)
        }
        path.setFillType(canvasKit.FillType.EvenOdd);

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);
        path.delete();
    }

    private drawArc(rect: Rect, path: Path, startDegrees: number, sweepDegrees: number) {
        path.moveTo(this.centerX, this.centerY);
        path.arcToOval(rect, startDegrees, sweepDegrees, false);
        path.close();
    }

    private drawTorus(rect: Rect, innerRect: Rect, path: Path) {
        path.addOval(rect);
        path.addOval(innerRect, true); // true = clockwise (creates hole)
    }

    private drawComplexTorusArc(rect: Rect, innerRect: Rect, path: Path, startDegrees: number, sweepDegrees: number) {
        const innerStartX = this.centerX + (this.radiusX * this.ratio) * Math.cos(this.startAngle);
        const innerStartY = this.centerY + (this.radiusY * this.ratio) * Math.sin(this.startAngle);

        const outerEndX = this.centerX + this.radiusX * Math.cos(this.endAngle);
        const outerEndY = this.centerY + this.radiusY * Math.sin(this.endAngle);

        path.moveTo(innerStartX, innerStartY);
        path.arcToOval(innerRect, startDegrees, sweepDegrees, false);

        path.lineTo(outerEndX, outerEndY);
        path.arcToOval(rect, startDegrees + sweepDegrees, -sweepDegrees, false);

        path.close();
    }

    override getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles = super.getSizeModifierHandles(size, fill, strokeColor);
        handles.push(new Handle(0, 0, size, 'arc-end', 'arc', fill, strokeColor))
        handles.push(new Handle(0, 0, size, 'arc-start', 'arc', fill, strokeColor))
        handles.push(new Handle(0, 0, size, 'center', 'ratio', fill, strokeColor))
        return handles;
    }

    override getModifierHandlesPos(handle: Handle): Point {
        if (handle.type == 'size') {
            return super.getSizeModifierHandlesPos(handle);
        } else if (handle.type == 'ratio') {
            return this.getRatioModifierHandlesPos(handle);
        } else if (handle.type == 'arc') {
            return this.getArcModifierHandlesPos(handle)
        }
        else {
            return { x: 0, y: 0 }
        }
    }

    private getRatioModifierHandlesPos(handle: Handle): Point {
        const size = handle.size;

        if (this.ratio === 0) {
            return {
                x: this.centerX - size,
                y: this.centerY - size
            };
        }

        const innerRadiusX = this.radiusX * this.ratio;
        const innerRadiusY = this.radiusY * this.ratio;

        const handleAngle = (handle.isDragging) ? handle.handleRatioAngle : (this.startAngle + this.endAngle) / 2

        const handleX = this.centerX + innerRadiusX * Math.cos(handleAngle);
        const handleY = this.centerY + innerRadiusY * Math.sin(handleAngle);

        return {
            x: handleX - size,
            y: handleY - size
        };
    }

    private getArcModifierHandlesPos(handle: Handle): Point {
        const size = handle.size;
        const gap = 20

        if (this.ratio === 0) {
            let handleX = 0;
            let handleY = 0;

            if (handle.pos == 'arc-end') {
                handleX = this.centerX + (this.radiusX - gap) * Math.cos(this.endAngle);
                handleY = this.centerY + (this.radiusY - gap) * Math.sin(this.endAngle);
            } else if (handle.pos == 'arc-start') {
                handleX = this.centerX + (this.radiusX - gap) * Math.cos(this.startAngle);
                handleY = this.centerY + (this.radiusY - gap) * Math.sin(this.startAngle);
            }

            return {
                x: handleX - size,
                y: handleY - size
            };
        } else {
            const outerRadiusX = this.radiusX;
            const outerRadiusY = this.radiusY;
            const innerRadiusX = this.radiusX * this.ratio;
            const innerRadiusY = this.radiusY * this.ratio;

            const midRadiusX = (outerRadiusX + innerRadiusX) / 2;
            const midRadiusY = (outerRadiusY + innerRadiusY) / 2;
            let handleX = 0;
            let handleY = 0;
            if (handle.pos == 'arc-end') {
                handleX = this.centerX + midRadiusX * Math.cos(this.endAngle);
                handleY = this.centerY + midRadiusY * Math.sin(this.endAngle);
            } else if (handle.pos == 'arc-start') {
                handleX = this.centerX + midRadiusX * Math.cos(this.startAngle);
                handleY = this.centerY + midRadiusY * Math.sin(this.startAngle);
            }

            return {
                x: handleX - size,
                y: handleY - size
            };
        }
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

    rotate(r: number) {
        this.rotation = r
    }

    override destroy(): void {

    }
}

export default Oval;