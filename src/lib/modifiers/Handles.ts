// Handle.ts
import type { Canvas } from "canvaskit-wasm";
import ShapeFactory from "@/lib/shapes/base/ShapeFactory";
import { Corner, HandleType, IShape } from "@lib/types/shapes";

export default class Handle {
    x: number;
    y: number;
    size: number;
    type: HandleType;
    shape: IShape;
    pos: Corner;
    isDragging: boolean = false;
    handleArcAngle: number | null = null;
    handleRatioAngle: number | null = null;
    private anchorPoint: { x: number, y: number } = { x: 0, y: 0 }

    constructor(x: number, y: number, size: number, pos: Corner, type: HandleType, fill: string | number[], stroke: string | number[]) {
        this.x = x;
        this.y = y;
        this.pos = pos
        this.size = size;
        this.type = type;

        // By default, use Oval for radius, Rect for size
        if (type === "radius" || type === 'arc' || type === 'ratio') {
            this.shape = ShapeFactory.createShape('oval', { x, y });
            this.shape.setRadius(size);
            if (type === 'arc' || type === 'ratio') {
                this.handleArcAngle = 0
                this.handleRatioAngle = 0
            }
        } else {
            this.shape = ShapeFactory.createShape('rect', { x, y });
            this.shape.setDim(size, size);
        }
        this.shape.setStrokeColor(stroke)
        this.shape.setFill(fill)
    }
    resetAnchorPoint() {
        this.anchorPoint = { x: 0, y: 0 }
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;

        this.shape.setCoord(x, y);

        this.shape.calculateBoundingRect();
    }
    isCollide(x: number, y: number): boolean {
        return this.shape.pointInShape(x, y)
    }
    updateShapeRadii(dx: number, dy: number, e: MouseEvent, shape: IShape) {

        const { left, right, top, bottom } = shape.boundingRect;

        let cornerX, cornerY, distX, distY, newRadius = 0;
        this.isDragging = true;

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

        let t0 = (t < 0) ? t + TWO_PI : t

        if (t0 < start) return prev;
        if (t0 > end) return prev;
        return t0;
    }

    updateShapeRatio(dx: number, dy: number, e: MouseEvent, shape: IShape) {

        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()
        this.isDragging = true

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
        const { start, end } = shape.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX);
        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI;

        let sweep = angle - start;
        if (sweep <= 0) sweep += 2 * Math.PI;

        shape.setArc(start, start + sweep);
    }

    draw(canvas: Canvas) {
        this.shape.draw(canvas);
    }
}
