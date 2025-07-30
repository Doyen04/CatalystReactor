// Handle.ts
import type { Canvas } from "canvaskit-wasm";
import { HandlePos, HandleType, IShape } from "@lib/types/shapes";
import CanvasKitResources from "@lib/core/CanvasKitResource";

export default class Handle {
    x: number;
    y: number;
    size: number;
    type: HandleType;
    pos: HandlePos;
    stroke: string | number[]
    fill: string | number[]
    isDragging: boolean = false;
    handleArcAngle: number | null = null;
    handleRatioAngle: number | null = null;
    private anchorPoint: { x: number, y: number } = { x: 0, y: 0 }

    constructor(x: number, y: number, size: number, pos: HandlePos, type: HandleType, fill: string | number[], stroke: string | number[]) {
        this.x = x;
        this.y = y;
        this.pos = pos;
        this.size = size;
        this.type = type;
        this.stroke = stroke;
        this.fill = fill

        // By default, use Oval for radius, Rect for size
        if (type === "radius" || type === 'arc' || type === 'ratio') {
            if (type === 'arc' || type === 'ratio') {
                this.handleArcAngle = 0
                this.handleRatioAngle = 0
            }
        }
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

    resetAnchorPoint() {
        this.anchorPoint = { x: 0, y: 0 }
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    isCollide(px: number, py: number): boolean {
        // Rectangle handle
        const hpad = 3
        if (this.type !== "radius" && this.type !== "arc" && this.type !== "ratio") {
            return (
                px >= this.x - hpad &&
                px <= this.x + this.size + hpad &&
                py >= this.y - hpad &&
                py <= this.y + this.size + hpad
            );
        }
        // Oval handle (circle collision)
        const dx = px - (this.x);
        const dy = py - (this.y);
        const r = this.size * 2;
        return dx * dx + dy * dy <= r * r;
    }

    updateShapeRadii(dx: number, dy: number, e: MouseEvent, shape: IShape) {

        const { left, right, top, bottom } = shape.boundingRect;

        let cornerX, cornerY, distX, distY, newRadius = 0;

        switch (this.pos) {
            case 'top-left':
                cornerX = left;
                cornerY = top;
                distX = e.offsetX - cornerX;
                distY = e.offsetY - cornerY;
                if (distX >= 0 && distY >= 0) {
                    newRadius = Math.min(distX, distY);
                }
                break;
            case 'top-right':
                cornerX = right;
                cornerY = top;
                distX = e.offsetX - cornerX;
                distY = e.offsetY - cornerY;
                if (distX <= 0 && distY >= 0) {
                    newRadius = Math.min(Math.abs(distX), distY);
                }
                break;
            case 'bottom-left':
                cornerX = left;
                cornerY = bottom;
                distX = e.offsetX - cornerX;
                distY = e.offsetY - cornerY;
                if (distX >= 0 && distY <= 0) {
                    newRadius = Math.min(distX, Math.abs(distY));
                }
                break;
            case 'bottom-right':
                cornerX = right;
                cornerY = bottom;
                distX = e.offsetX - cornerX;
                distY = e.offsetY - cornerY;
                if (distX <= 0 && distY <= 0) {
                    newRadius = Math.min(Math.abs(distX), Math.abs(distY));
                }
                break;
        }
        shape.updateBorderRadius(newRadius, this.pos);
    }

    updateShapeDim(dx: number, dy: number, e: MouseEvent, shape: IShape) {
        let [width, height] = [0, 0]
        let nx = 0
        let ny = 0
        let deltaX = 0
        let deltaY = 0

        switch (this.pos) {
            case 'top-left':
                if (this.anchorPoint.x === 0 && this.anchorPoint.y === 0) {
                    this.anchorPoint = { x: shape.boundingRect.right, y: shape.boundingRect.bottom }
                }
                break;
            case 'top-right':
                if (this.anchorPoint.x === 0 && this.anchorPoint.y === 0) {
                    this.anchorPoint = { x: shape.boundingRect.left, y: shape.boundingRect.bottom }
                }
                break
            case 'bottom-left':
                if (this.anchorPoint.x === 0 && this.anchorPoint.y === 0) {
                    this.anchorPoint = { x: shape.boundingRect.right, y: shape.boundingRect.top }
                }
                break
            case 'bottom-right':
                if (this.anchorPoint.x === 0 && this.anchorPoint.y === 0) {
                    this.anchorPoint = { x: shape.boundingRect.left, y: shape.boundingRect.top }
                }
                break;
            default:
                break;
        }

        deltaX = (e.offsetX - this.anchorPoint.x);
        deltaY = (e.offsetY - this.anchorPoint.y);
        width = Math.abs(deltaX);
        height = Math.abs(deltaY);
        nx = Math.min(this.anchorPoint.x, e.offsetX);
        ny = Math.min(this.anchorPoint.y, e.offsetY);

        shape.setCoord(nx, ny);
        shape.setDim(width, height);
    }

    clampAngleToArc(t: number, start: number, end: number, prev: number): number {
        const TWO_PI = 2 * Math.PI;

        const t0 = (t < 0) ? t + TWO_PI : t

        if (t0 < start) return prev;
        if (t0 > end) return prev;
        return t0;
    }

    updateShapeRatio(dx: number, dy: number, e: MouseEvent, shape: IShape) {

        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()

        const radiusX = width / 2;
        const radiusY = height / 2;

        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y

        //parametric deg
        const handleAngle = Math.atan2(radiusX * deltaY, radiusY * deltaX);
        const { start, end } = shape.getArcAngles()
        if (shape.isArc()) {
            console.log('inside ');
            const Angle = this.clampAngleToArc(handleAngle, start, end, this.handleRatioAngle)
            this.handleRatioAngle = Angle

        } else {
            this.handleRatioAngle = handleAngle
        }

        const deg = Math.atan2(deltaY, deltaX)
        const cos = Math.cos(deg);
        const sin = Math.sin(deg);

        const ellipseRadiusAtAngle = Math.sqrt(
            (radiusX * radiusX * radiusY * radiusY) /
            (radiusY * radiusY * cos * cos + radiusX * radiusX * sin * sin)
        );

        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const ratio = Math.min(0.99, distanceFromCenter / ellipseRadiusAtAngle);
        console.log(ratio);
        shape.setRatio(ratio)
    }

    updateShapeArc(dx: number, dy: number, e: MouseEvent, shape: IShape) {
        if (this.pos == 'arc-end') {
            this.updateShapeArcEnd(dx, dy, e, shape)
        } else {
            this.updateShapeArcStart(dx, dy, e, shape)
        }
    }

    updateShapeArcStart(dx: number, dy: number, e: MouseEvent, shape: IShape) {
        const { x, y } = shape.getCenterCoord();
        const { width, height } = shape.getDim()
        const deltaX = e.offsetX - x;
        const deltaY = e.offsetY - y;
        const radiusX = width / 2;
        const radiusY = height / 2;
        const { start, end } = shape.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX);

        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI;
        const delta = angle - start;

        shape.setArc(start + delta, end + delta);
    }

    updateShapeArcEnd(dx: number, dy: number, e: MouseEvent, shape: IShape) {
        const { x, y } = shape.getCenterCoord();
        const { width, height } = shape.getDim()
        const deltaX = e.offsetX - x;
        const deltaY = e.offsetY - y;
        const radiusX = width / 2;
        const radiusY = height / 2;
        const { start } = shape.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX);
        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI;

        let sweep = angle - start;
        if (sweep <= 0) sweep += 2 * Math.PI;

        shape.setArc(start, start + sweep);
    }

    createPaint() {
        if (!this.resource) return
        const cnvsKit = this.resource

        const fill = (Array.isArray(this.fill)) ? this.fill : cnvsKit.canvasKit.parseColorString(this.fill)
        const strokeColor = (Array.isArray(this.stroke)) ? this.stroke : cnvsKit.canvasKit.parseColorString(this.stroke)


        cnvsKit.paint.setColor(fill);

        cnvsKit.strokePaint.setColor(strokeColor);
        cnvsKit.strokePaint.setStrokeWidth(1);

        return { fill: this.resource.paint, stroke: this.resource.strokePaint }
    }

    drawRect(canvas: Canvas) {
        const { fill, stroke } = this.createPaint();
        const rect = this.resource.canvasKit.LTRBRect(
            this.x, this.y,
            this.x + this.size, this.y + this.size
        );
        canvas.drawRect(rect, fill);
        canvas.drawRect(rect, stroke);
    }


    // Draw a small oval at (x, y)
    drawOval(canvas: Canvas) {
        const { fill, stroke } = this.createPaint();
        const ovalRect = this.resource.canvasKit.LTRBRect(
            this.x, this.y,
            this.x + this.size * 2, this.y + this.size * 2
        );
        canvas.drawOval(ovalRect, fill);
        canvas.drawOval(ovalRect, stroke);
    }

    draw(canvas: Canvas) {
        if (this.type === "radius" || this.type === "arc" || this.type === "ratio") {
            this.drawOval(canvas);
        } else {
            this.drawRect(canvas);
        }
    }
}
