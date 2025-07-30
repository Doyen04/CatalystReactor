import type { Canvas } from "canvaskit-wasm";
import Shape from "../base/Shape";
import { Properties, Sides } from "@lib/types/shapes";
import Handle from "@lib/modifiers/Handles";
import { Points } from "@lib/types/shapeTypes";

class Polygon extends Shape {
    centerX: number;
    centerY: number;
    bRadius: number;
    sides: Sides;
    points: Points[]
    radiusX: number;
    radiusY: number;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.centerX = 0;
        this.centerY = 0;
        this.bRadius = 0;
        this.sides = { sides: 5 };
        this.radiusX = 0;
        this.radiusY = 0;
        this.points = this.generateRegularPolygon();
    }

    override moveShape(dx: number, dy: number): void {
        this.transform.x += dx;
        this.transform.y += dy;
        this.centerX += dx;
        this.centerY += dy;

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect();
    }

    override setDim(width: number, height: number) {
        this.radiusX = width / 2;
        this.radiusY = height / 2;

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateRegularPolygon();
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateRegularPolygon();
        this.calculateBoundingRect()
    }

    override setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        this.centerX = (dragStart.x + mx) / 2;
        this.centerY = (dragStart.y + my) / 2;

        const newRadiusX = Math.abs(deltaX) / 2;
        const newRadiusY = Math.abs(deltaY) / 2;

        if (shiftKey) {
            const maxRadius = Math.max(newRadiusX, newRadiusY);
            this.radiusX = this.radiusY = maxRadius;

            this.centerX = dragStart.x + (deltaX >= 0 ? maxRadius : -maxRadius);
            this.centerY = dragStart.y + (deltaY >= 0 ? maxRadius : -maxRadius);
        } else {
            this.radiusX = newRadiusX;
            this.radiusY = newRadiusY;
        }

        this.transform.x = this.centerX - this.radiusX;
        this.transform.y = this.centerY - this.radiusY;

        this.points = this.generateRegularPolygon();
        this.calculateBoundingRect();
    }

    setSides(sides: number) {
        sides = Math.max(3, sides)
        this.sides = { sides }
        this.points = this.generateRegularPolygon()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.setDim(prop.size.width, prop.size.height)
        this.style = prop.style
        console.log(prop, 'inside poly');
        this.setSides(prop.sides.sides)
    }

    override getProperties(): Properties {
        return { transform: this.transform, size: this.getDim(), style: this.style, sides: this.sides }
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle);
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle);
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle);
        }
        return { x: 0, y: 0 };
    }
    private getRadiusModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        const hPad = 7;
        if (this.points.length > 0) {
            const [x, y] = this.points[0];
            return { x: x - size, y: y + hPad };
        }
        return { x: this.centerX, y: this.centerY };
    }

    private getVerticesModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        const hPad = 7;
        if (this.points.length > 0) {
            const [x, y] = this.points[1];
            return { x: x - size, y: y + hPad };
        }
        return { x: this.centerX, y: this.centerY };
    }


    override getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[],): Handle[] {
        const handles = super.getSizeModifierHandles(size, fill, strokeColor);
        handles.push(new Handle(0, 0, size, 'top', 'radius', fill, strokeColor));
         handles.push(new Handle(0, 0, size, 'right', 'vertices', fill, strokeColor));
        return handles;
    }

    override getDim(): { width: number, height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    private generateRegularPolygon(): Points[] {
        const points: Points[] = [];
        const angleStep = (2 * Math.PI) / this.sides.sides;

        for (let i = 0; i < this.sides.sides; i++) {
            const angle = i * angleStep - (Math.PI / 2); // Start from top
            const x = this.centerX + this.radiusX * Math.cos(angle);
            const y = this.centerY + this.radiusY * Math.sin(angle);
            const res: Points = [x, y];
            points.push(res);
        }

        return points;
    }

    override calculateBoundingRect(): void {
        const left = this.transform.x;
        const top = this.transform.y;
        const right = this.transform.x + this.radiusX * 2;
        const bottom = this.transform.y + this.radiusY * 2;

        this.boundingRect = {
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        this.setPaint();

        const path = new this.resource.canvasKit.Path();
        const [startX, startY] = this.points[0];
        path.moveTo(startX, startY);

        for (let i = 1; i < this.points.length; i++) {
            const [x, y] = this.points[i];
            path.lineTo(x, y);
        }

        path.close();

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);

        path.delete();
    }

    override pointInShape(x: number, y: number): boolean {
        const pts = this.points;
        const n = pts.length;
        if (n < 3) return false;

        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const [xi, yi] = pts[i];
            const [xj, yj] = pts[j];
            const intersects =
                (yi > y) !== (yj > y) &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

            if (intersects) inside = !inside;
        }

        return inside;
    }

    override cleanUp(): void {

    }
    override destroy(): void {

    }

}

export default Polygon;