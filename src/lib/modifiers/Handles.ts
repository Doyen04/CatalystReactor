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
    anchorPoint: { x: number, y: number } = { x: 0, y: 0 }

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
    updateRadii(dx: number, dy: number, e: MouseEvent, shape: IShape) {

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

    updateDim(dx: number, dy: number, e: MouseEvent, shape: IShape) {
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
    updateRatio(dx: number, dy: number, e: MouseEvent, shape: IShape){
        const {x, y} = shape.getCenterCoord()
        
    }

    draw(canvas: Canvas) {
        this.shape.draw(canvas);
    }
}
