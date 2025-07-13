import type { CanvasKit, Paint, Canvas } from "canvaskit-wasm";
import { Shape } from "@/lib/shapes";

class Polygon extends Shape {
    centerX: number;
    centerY: number;
    bRadius: number;
    sides: number;
    point: Points[]
    radiusX: number;
    radiusY: number;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.centerX = 0;
        this.centerY = 0;
        this.bRadius = 0;
        this.sides = 5;
        this.radiusX = 0;
        this.radiusY = 0;
        this.point = this.generateRegularPolygon();
    }
    override setDim(width: number, height: number) {
        this.radiusX = width/2;
        this.radiusY = height/2;

        this.centerX = this.x + this.radiusX
        this.centerY = this.y + this.radiusY

        this.point = this.generateRegularPolygon();
        this.calculateBoundingRect()
    }
    override setCoord(x: number, y: number): void {
        this.x = x;
        this.y = y;

        this.centerX = this.x + this.radiusX
        this.centerY = this.y + this.radiusY

        this.point = this.generateRegularPolygon();
        this.calculateBoundingRect()
    }

    private generateRegularPolygon(): Points[] {
        const points: Points[] = [];
        const angleStep = (2 * Math.PI) / this.sides;

        for (let i = 0; i < this.sides; i++) {
            const angle = i * angleStep - (Math.PI / 2); // Start from top
            const x = this.centerX + this.radiusX * Math.cos(angle);
            const y = this.centerY + this.radiusY * Math.sin(angle);
            const res: Points = [x, y];
            points.push(res);
        }

        return points;
    }

    override moveShape(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.centerX += dx;
        this.centerY += dy;
        
        this.point = this.generateRegularPolygon()
        this.calculateBoundingRect();
    }

    override calculateBoundingRect(): void {
        const left = this.x;
        const top = this.y;
        const right = this.x + this.radiusX * 2;
        const bottom = this.y + this.radiusY * 2;

        this.boundingRect = {
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };
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

        this.x = this.centerX - this.radiusX;
        this.y = this.centerY - this.radiusY;

        this.point = this.generateRegularPolygon();
        this.calculateBoundingRect();
    }


    override draw(canvas: Canvas): void {
        if(!this.resource) return
        
        this.setPaint();

        const path = new this.resource.canvasKit.Path();
        const [startX, startY] = this.point[0];
        path.moveTo(startX, startY);

        for (let i = 1; i < this.point.length; i++) {
            const [x, y] = this.point[i];
            path.lineTo(x, y);
        }

        path.close();

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);

        path.delete();
    }

    override pointInShape(x: number, y: number): boolean {
        const pts = this.point;
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
    override destroy(): void {
        
    }

}

export default Polygon;