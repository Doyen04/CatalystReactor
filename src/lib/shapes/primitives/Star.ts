import Handle from '@/lib/modifiers/Handles';
import Shape from '../base/Shape';
import type { Canvas, Path, } from "canvaskit-wasm";
import { HandlePos, Properties } from '@lib/types/shapes';
import { Points } from '@lib/types/shapeTypes';
import clamp from '@lib/helper/clamp';


class Star extends Shape {
    radiusX: number;
    radiusY: number;
    spikes: number;
    centerX: number;
    centerY: number;
    ratio: number;
    points: Points[]
    bRadius: number = 5;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
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

    updateBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return;

        const { width, height } = this.getDim();
        const max = Math.min(width, height) / 2;
        const newRad = Math.max(0, Math.min(newRadius, max));

        this.bRadius = newRad
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

    setVertexCount(points: number): void {
        this.spikes = clamp(points, 3, 60);

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
        this.setVertexCount(prop.spikesRatio.spikes)
        this.setRatio(prop.spikesRatio.ratio)
    }

    getVertexCount(): number {
        return this.spikes
    }
    override getProperties(): Properties {
        return { transform: this.transform, size: this.getDim(), style: this.style, spikesRatio: { spikes: this.spikes, ratio: this.ratio } }
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle);
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle);
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle);
        } else if (handle.type === 'ratio') {
            return this.getRatioModifierHandlesPos(handle);
        }
        return { x: 0, y: 0 };
    }

    private getRadiusModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        const padding = 10;
        if (this.points.length > 0) {
            const [x, y] = this.points[0];
            return { x: x - size, y: y + (handle.isDragging || this.bRadius >= padding ? this.bRadius : padding) };
        }
        return { x: this.centerX, y: this.centerY };
    }

    private getRatioModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        if (this.points.length > 0) {
            const [x, y] = this.points[1];
            return { x: x - size, y: y - size };
        }
        return { x: this.centerX, y: this.centerY };
    }

    private getVerticesModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        if (this.points.length > 0) {
            const [x, y] = this.points[2];
            return { x: x - size, y: y - size };
        }
        return { x: this.centerX, y: this.centerY };
    }

    override getModifierHandles(fill: string | number[], strokeColor: string | number[],): Handle[] {
        const handles = super.getSizeModifierHandles(fill, strokeColor);
        handles.push(new Handle(0, 0, 'top', 'radius', fill, strokeColor));
        handles.push(new Handle(0, 0, 'right', 'vertices', fill, strokeColor));
        handles.push(new Handle(0, 0, 'between', 'ratio', fill, strokeColor));
        return handles;
    }

    getCenterCoord(): { x: number, y: number } {
        return { x: this.centerX, y: this.centerY }
    }
    override getDim(): { width: number; height: number; } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        this.setPaint();
        const path = new this.resource.canvasKit.Path();
        if (this.bRadius > 0) {
            this.createRoundedStarPath(path, canvas);
        } else {
            path.moveTo(this.points[0][0], this.points[0][1]);

            for (let i = 1; i < this.points.length; i++) {
                path.lineTo(this.points[i][0], this.points[i][1]);
            }
            path.close();
        }

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);

        path.delete(); // Clean up path object
    }

    private computeRoundedCorner(index: number) {
        const n = this.points.length;

        const prev = this.points[(index - 1 + n) % n];
        const curr = this.points[index];
        const next = this.points[(index + 1) % n];

        const vec1 = [prev[0] - curr[0], prev[1] - curr[1]];
        const vec2 = [next[0] - curr[0], next[1] - curr[1]];

        const len1 = Math.hypot(vec1[0], vec1[1]);
        const len2 = Math.hypot(vec2[0], vec2[1]);
        if (len1 === 0 || len2 === 0) {
            return {
                startPoint: curr,
                endPoint: curr,
                controlPoint: curr,
                maxRadius: 0,
                logicalRadius: 0,
                logicalStart: curr
            };
        }

        const norm1 = [vec1[0] / len1, vec1[1] / len1];
        const norm2 = [vec2[0] / len2, vec2[1] / len2];

        const logicalRadius = Math.min(len1 / 2, len2 / 2) || 0;

        const dot = norm1[0] * norm2[0] + norm1[1] * norm2[1];
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

        // const halfAngle = angle / 2;
        //The maximum radius is proportional to the shorter edge length, scaled by how 'sharp' the angle is.
        const maxAllowedRadius =Math.min(len1, len2) * Math.sin(angle) / 2;
        const maxRadius = Math.min(this.bRadius, maxAllowedRadius);
        console.log(`Max Radius: ${maxRadius}, Logical Radius: ${logicalRadius}`);
        
        const startPoint = [
            curr[0] + norm1[0] * maxRadius,
            curr[1] + norm1[1] * maxRadius
        ];
        const endPoint = [
            curr[0] + norm2[0] * maxRadius,
            curr[1] + norm2[1] * maxRadius
        ];
        const logicalStart = [
            curr[0] + norm1[0] * logicalRadius,
            curr[1] + norm1[1] * logicalRadius
        ];
        return { startPoint, endPoint, controlPoint: curr, maxRadius, logicalRadius };
    }

    private createRoundedStarPath(path: Path, canvas: Canvas): void {
        const numPoints = this.points.length;

        const firstCorner = this.computeRoundedCorner(0);
        console.log(firstCorner.maxRadius, firstCorner.logicalRadius,);

        if (firstCorner.maxRadius >= firstCorner.logicalRadius) {
            path.moveTo(firstCorner.logicalStart[0], firstCorner.logicalStart[1]);
        } else {
            path.moveTo(firstCorner.startPoint[0], firstCorner.startPoint[1]);
        }

        for (let i = 0; i < numPoints; i++) {
            const { controlPoint, maxRadius, endPoint } = this.computeRoundedCorner(i);
            const nextIndex = (i + 1) % numPoints;
            const nextCorner = this.computeRoundedCorner(nextIndex);

            path.arcToTangent(controlPoint[0], controlPoint[1], nextCorner.startPoint[0], nextCorner.startPoint[1], maxRadius);

            const rect = this.resource.canvasKit.LTRBRect(controlPoint[0], controlPoint[1], controlPoint[0] + 5, controlPoint[1] + 5);
            canvas.drawRect(rect, this.resource.strokePaint);

            const rect2 = this.resource.canvasKit.LTRBRect(endPoint[0], endPoint[1], endPoint[0] + 5, endPoint[1] + 5);
            canvas.drawRect(rect2, this.resource.strokePaint);

            const rect3 = this.resource.canvasKit.LTRBRect(nextCorner.startPoint[0], nextCorner.startPoint[1], nextCorner.startPoint[0] + 5, nextCorner.startPoint[1] + 5);
            canvas.drawRect(rect3, this.resource.strokePaint);
        }

        path.close();
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