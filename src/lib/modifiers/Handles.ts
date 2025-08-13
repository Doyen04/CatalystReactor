// Handle.ts
import type { Canvas } from "canvaskit-wasm";
import { HandlePos, HandleType } from "@lib/types/shapes";
import CanvasKitResources from "@lib/core/CanvasKitResource";
import clamp from "@lib/helper/clamp";
import SceneNode from "@lib/core/SceneNode";

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

    constructor(x: number, y: number, pos: HandlePos, type: HandleType, fill: string | number[], stroke: string | number[]) {
        this.x = x;
        this.y = y;
        this.pos = pos;
        this.type = type;
        this.stroke = stroke;
        this.fill = fill

        // By default, use Oval for radius, Rect for size
        if (type !== "size") {
            this.size = 4
            if (type === 'arc' || type === 'c-ratio') {
                this.handleArcAngle = 0
                this.handleRatioAngle = 0
            }
        } else {
            this.size = 6; // Default size for the rect shaped resizers
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
        if (this.type === "size") {
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
    private calculateRatioFromMousePosition(e: MouseEvent, centerX: number, centerY: number, width: number, height: number): number {
        const deltaX = e.offsetX - centerX;
        const deltaY = e.offsetY - centerY;
        const radiusX = width / 2;
        const radiusY = height / 2;

        const deg = Math.atan2(deltaY, deltaX);
        const cos = Math.cos(deg);
        const sin = Math.sin(deg);

        const ellipseRadiusAtAngle = Math.sqrt(
            (radiusX * radiusX * radiusY * radiusY) /
            (radiusY * radiusY * cos * cos + radiusX * radiusX * sin * sin)
        );

        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const ratio = Math.min(0.99, distanceFromCenter / ellipseRadiusAtAngle);

        return ratio;
    }
    updateShapeRadii(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {

        const { left, right, top, bottom } = scene.getShape().boundingRect;

        let cornerX: number, cornerY: number, distX: number, distY: number, newRadius = 0;

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
            case 'top':
                cornerY = top;
                distY = e.offsetY - cornerY;
                if (distY >= 0) {
                    newRadius = Math.abs(distY);
                }
                break
            default:
                console.log('not implemented position for radius handle');

                break
        }
        scene.getShape().updateBorderRadius(newRadius, this.pos);
    }

    updateShapeDim(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        let [width, height] = [0, 0]
        let nx = 0
        let ny = 0
        let deltaX = 0
        let deltaY = 0

        const shape = scene.getShape();

        if (this.anchorPoint.x === 0 && this.anchorPoint.y === 0) {
            switch (this.pos) {
                case 'top-left':
                    this.anchorPoint = { x: shape.boundingRect.right, y: shape.boundingRect.bottom };
                    break;
                case 'top-right':
                    this.anchorPoint = { x: shape.boundingRect.left, y: shape.boundingRect.bottom };
                    break;
                case 'bottom-left':
                    this.anchorPoint = { x: shape.boundingRect.right, y: shape.boundingRect.top };
                    break;
                case 'bottom-right':
                    this.anchorPoint = { x: shape.boundingRect.left, y: shape.boundingRect.top };
                    break;
                default:
                    break;
            }
        }

        deltaX = (e.offsetX - this.anchorPoint.x);
        deltaY = (e.offsetY - this.anchorPoint.y);
        nx = Math.min(this.anchorPoint.x, e.offsetX);
        ny = Math.min(this.anchorPoint.y, e.offsetY);
      
        height = Math.abs(deltaY);
        width = Math.abs(deltaX);

        scene.setFlip(deltaX < 0, deltaY < 0);
        scene.setPosition(nx, ny);
        shape.updateDim(width, height);
    }

    clampAngleToArc(t: number, start: number, end: number, prev: number): number {
        const TWO_PI = 2 * Math.PI;

        const t0 = (t < 0) ? t + TWO_PI : t

        if (t0 < start) return prev;
        if (t0 > end) return prev;
        return t0;
    }

    updateOvalRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {

        const shape = scene.getShape();
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

        const ratio = this.calculateRatioFromMousePosition(e, x, y, width, height);
        shape.setRatio(ratio)
    }

    updateStarRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape();
        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()

        const ratio = this.calculateRatioFromMousePosition(e, x, y, width, height);

        shape.setRatio(ratio);
    }

    updateShapeArc(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        if (this.pos == 'arc-end') {
            this.updateShapeArcEnd(dx, dy, e, scene)
        } else {
            this.updateShapeArcStart(dx, dy, e, scene)
        }
    }

    updateShapeArcStart(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape();
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

    updateShapeArcEnd(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape();
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

    updateShapeVertices(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape();
        const GAP = 10; // defined distance for both x and y
        const count = shape.getVertexCount();

        const next = clamp(count + 1, 3, 60);
        const prev = clamp(count - 1, 3, 60);

        const vertex = shape.getShapeType() === 'star' ? 2 : 1;

        const { x: px, y: py } = shape.getVertex(prev, vertex);
        const { x: nx, y: ny } = shape.getVertex(next, vertex);
        if ((e.offsetY < ny) &&
            (Math.abs(e.offsetX - nx) < GAP ||
                Math.abs(e.offsetY - ny) < GAP)
        ) {
            shape.setVertexCount(next);
        } else if ((e.offsetY > py) &&
            (Math.abs(e.offsetX - px) < GAP ||
                Math.abs(e.offsetY - py) < GAP)
        ) {
            shape.setVertexCount(prev);
        }
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
        if (this.type !== "size") {
            this.drawOval(canvas);
        } else {
            this.drawRect(canvas);
        }
    }
}
