import Handle from '@/lib/modifiers/Handles';
import Shape from '../base/Shape';
import type { Canvas, } from "canvaskit-wasm";
import { Corner, HandleType, Properties, Sides } from '@lib/types/shapes';
import { Points } from '@lib/types/shapeTypes';

class Star extends Shape {
    radiusX: number;
    radiusY: number;
    spikes: number;
    centerX: number;
    centerY: number;
    ratio: number;
    points: Points[]

    constructor(x: number, y: number, { rotation = 0, ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.radiusX = 0;
        this.radiusY = 0;
        this.spikes = 5;
        this.ratio = 0.5;
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
            const radiusX = i % 2 === 0 ? this.radiusX : this.radiusX * this.ratio;
            const radiusY = i % 2 === 0 ? this.radiusY : this.radiusY * this.ratio;

            const x = this.centerX + Math.cos(angle) * radiusX;
            const y = this.centerY + Math.sin(angle) * radiusY;
            points.push([x, y]);
        }

        return points;
    }

    override moveShape(mx: number, my: number): void {
        this.transform.x += mx;
        this.transform.y += my;
        this.centerX += mx;
        this.centerY += my;

        this.points = this.generateStarPoints();
        this.calculateBoundingRect();
    }

    setDim(width: number, height: number) {
        this.radiusX = width / 2;
        this.radiusY = height / 2;

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;
        this.centerX = x + this.radiusX;
        this.centerY = y + this.radiusY;

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
            this.radiusX = this.radiusY = maxRadius;

            this.centerX = dragStart.x + (deltaX >= 0 ? maxRadius : -maxRadius);
            this.centerY = dragStart.y + (deltaY >= 0 ? maxRadius : -maxRadius);
        } else {
            // Free form star - use actual dimensions
            this.radiusX = newRadiusX;
            this.radiusY = newRadiusY;
        }

        // Update position for bounding calculations
        this.transform.x = this.centerX - this.radiusX;
        this.transform.y = this.centerY - this.radiusY;

        this.points = this.generateStarPoints();
        this.calculateBoundingRect();
    }

    setSpikes(points: number): void {
        this.spikes = Math.max(3, points);

        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    setRotation(rotation: number): void {
        this.transform.rotation = rotation % 360;
    }

    setRatio(rat: number) {
        this.ratio = rat
        this.points = this.generateStarPoints();
        this.calculateBoundingRect()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.setDim(prop.size.width, prop.size.height)
        this.style = prop.style
        this.setSpikes(prop.spikesRatio.spikes)
        this.setRatio(prop.spikesRatio.ratio)
    }

    override getProperties(): Properties {
        return { transform: this.transform, size: this.getDim(), style: this.style, spikesRatio: { spikes: this.spikes, ratio: this.ratio } }
    }
    override getModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle);
        }
        return { x: 0, y: 0 };
    }
    override getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[],): Handle[] {
        const handles = super.getSizeModifierHandles(size, fill, strokeColor);
        return handles;
    }

    override getDim(): { width: number; height: number; } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

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

    override calculateBoundingRect(): void {
        const maxRadiusX = this.radiusX
        const maxRadiusY = this.radiusY

        const left = this.centerX - maxRadiusX;
        const top = this.centerY - maxRadiusY;
        const right = this.centerX + maxRadiusX;
        const bottom = this.centerY + maxRadiusY;

        this.boundingRect = { left, top, right, bottom };
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
    override cleanUp(): void {

    }
    override destroy(): void {

    }
}

export default Star;