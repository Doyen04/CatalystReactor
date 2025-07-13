import { Handle } from '@/lib/modifiers';
import { Shape } from '@/lib/shapes';
import type { Canvas, CanvasKit, Paint, } from "canvaskit-wasm";

class Star extends Shape {
    outerRadiusX: number;
    outerRadiusY: number;
    innerRadiusX: number;
    innerRadiusY: number;
    spikes: number;
    centerX: number;
    centerY: number;
    ratio: number;
    points: Points[]

    constructor(x: number, y: number, { rotation = 0, ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.outerRadiusX = 0;
        this.outerRadiusY = 0;
        this.spikes = 5;
        this.ratio = 0.5;
        this.innerRadiusX = 0;
        this.innerRadiusY = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    private generateStarPoints(): Points[] {
        const angleStep = (Math.PI * 2) / this.spikes;
        const points: Points[] = [];

        for (let i = 0; i < this.spikes * 2; i++) {
            const angle = i * (angleStep / 2) - (Math.PI / 2);
            const radiusX = i % 2 === 0 ? this.outerRadiusX : this.innerRadiusX;
            const radiusY = i % 2 === 0 ? this.outerRadiusY : this.innerRadiusY;

            const x = this.centerX + Math.cos(angle) * radiusX;
            const y = this.centerY + Math.sin(angle) * radiusY;
            points.push([x, y]);
        }

        return points;
    }

    setDim(width: number, height: number) {
        this.outerRadiusX = width/2;
        this.outerRadiusY = height/2;

        this.innerRadiusX = this.outerRadiusX * this.ratio
        this.innerRadiusY = this.outerRadiusY * this.ratio

        this.centerX = this.x + this.outerRadiusX
        this.centerY = this.y + this.outerRadiusY

        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }
    override setCoord(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.centerX = x + this.outerRadiusX;
        this.centerY = y + this.outerRadiusY;

        this.points = this.generateStarPoints();
        this.calculateBoundingRect();
    }

    override draw(canvas: Canvas): void {
        if(!this.resource) return

        this.setPaint();
        const path = new this.resource.canvasKit.Path();

        path.moveTo(this.points[0][0], this.points[0][1]);

        for (let i = 1; i < this.points.length; i++) {
            path.lineTo(this.points[i][0], this.points[i][1]);
        }
        path.close();

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);

        path.delete(); // Clean up path object
    }

    override moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
        this.centerX += mx;
        this.centerY += my;
        
        this.points = this.generateStarPoints();
        this.calculateBoundingRect();
    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x;
        const deltaY = my - dragStart.y;

        this.centerX = (dragStart.x + mx) / 2;
        this.centerY = (dragStart.y + my) / 2;

        const newRadiusX = Math.abs(deltaX) / 2;
        const newRadiusY = Math.abs(deltaY) / 2;

        if (shiftKey) {
            const maxRadius = Math.max(newRadiusX, newRadiusY);
            this.outerRadiusX = this.outerRadiusY = maxRadius;
            this.innerRadiusX = this.innerRadiusY = maxRadius * this.ratio;

            this.centerX = dragStart.x + (deltaX >= 0 ? maxRadius : -maxRadius);
            this.centerY = dragStart.y + (deltaY >= 0 ? maxRadius : -maxRadius);
        } else {
            // Free form star - use actual dimensions
            this.outerRadiusX = newRadiusX;
            this.outerRadiusY = newRadiusY;
            this.innerRadiusX = newRadiusX * this.ratio;
            this.innerRadiusY = newRadiusY * this.ratio;
        }

        // Update position for bounding calculations
        this.x = this.centerX - Math.max(this.outerRadiusX, this.innerRadiusX);
        this.y = this.centerY - Math.max(this.outerRadiusY, this.innerRadiusY);

        this.points = this.generateStarPoints();
        this.calculateBoundingRect();
    }

    override calculateBoundingRect(): void {
        const maxRadiusX = Math.max(this.outerRadiusX, this.innerRadiusX);
        const maxRadiusY = Math.max(this.outerRadiusY, this.innerRadiusY);

        const left = this.centerX - maxRadiusX;
        const top = this.centerY - maxRadiusY;
        const right = this.centerX + maxRadiusX;
        const bottom = this.centerY + maxRadiusY;

        this.boundingRect = { left, top, right, bottom };
    }

    getModifersPos(modifierName: string, size: number, handleType: HandleType): { x: number; y: number; } {
        if (handleType === 'size') {
            return super.getModifersPos(modifierName, size, handleType);
        }
        return { x: 0, y: 0 };
    }
    getHandles(size: number, fill: string | number[],strokeColor: string | number[], ): Handle[] {
        const handles = super.getHandles(size, fill,strokeColor);
        return handles;
    }

    // Additional star-specific methods
    setSpikes(points: number): void {
        this.spikes = Math.max(3, points);

        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    setRotation(rotation: number): void {
        this.rotation = rotation % 360;
    }

    setInnerRadius(radiusX: number, radiusY: number): void {
        this.innerRadiusX = Math.max(1, Math.min(radiusX, this.outerRadiusX - 1));
        this.innerRadiusY = Math.max(1, Math.min(radiusY, this.outerRadiusY - 1));

        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    override pointInShape(x: number, y: number): boolean {
        if (this.points.length < 3) return false;

        let inside = false;

        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const [xi, yi] = this.points[i];
            const [xj, yj] = this.points[j];

            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }
    override destroy(): void {
        
    }
}

export default Star;