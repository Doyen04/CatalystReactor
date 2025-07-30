import type { Canvas, Path } from "canvaskit-wasm";
import Shape from "../base/Shape";
import { HandlePos, Properties, Sides } from "@lib/types/shapes";
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
    updateBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return;

        const { width, height } = this.getDim();
        const max = Math.min(width, height) / 2;
        const newRad = Math.max(0, Math.min(newRadius, max));

        this.bRadius = newRad
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
        const padding = 7;
        if (this.points.length > 0) {
            const [x, y] = this.points[0];
            return { x: x - size, y: y + (handle.isDragging || this.bRadius >= padding ? this.bRadius : padding) };
        }
        return { x: this.centerX, y: this.centerY };
    }

    private getVerticesModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        const size = handle.size;
        if (this.points.length > 1) {
            // If border radius is set, use the tangent point for vertex 1
            if (this.bRadius > 0) {
                const i = 1;
                const n = this.points.length;
                const prev = this.points[(i - 1 + n) % n];
                const curr = this.points[i];
                const next = this.points[(i + 1) % n];
                // Vector from previous to current
                const vec1 = [prev[0] - curr[0], prev[1] - curr[1]];
                const vec2 = [next[0] - curr[0], next[1] - curr[1]];

                // Calculate lengths
                const len1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
                const len2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);

                // Normalize vectors
                const norm1 = [vec1[0] / len1, vec1[1] / len1];
                const norm2 = [vec2[0] / len2, vec2[1] / len2];

                // Calculate the maximum radius for this corner to avoid overlaps
                const maxRadius = Math.min(len1 / 2, len2 / 2, this.bRadius);

                // Calculate start and end points of the arc
                const startPoint = [
                    curr[0] + norm1[0] * maxRadius,
                    curr[1] + norm1[1] * maxRadius
                ];
                const endPoint = [
                    curr[0] + norm2[0] * maxRadius,
                    curr[1] + norm2[1] * maxRadius
                ];

                const prevObj = { x: startPoint[0], y: startPoint[1] };
                const currObj = { x: curr[0], y: curr[1] };
                const nextObj = { x: endPoint[0], y: endPoint[1] };
                const { x: tangentX, y: tangentY } = this.computeQuadPoint(prevObj, currObj, nextObj, 0.5);

                console.log('tangentX, tangentY', tangentX, tangentY);

                return { x: tangentX - size, y: tangentY - size };
            } else {
                // No border radius, use raw vertex
                const [x, y] = this.points[1];
                return { x: x - size, y: y - size };
            }
        }
        return { x: this.centerX, y: this.centerY };
    }

    computeQuadPoint(P0: { x: number; y: number }, P1: { x: number; y: number }, P2: { x: number; y: number }, t: number) {
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        return { x, y };
    }
    computeQuadTangent(P0, P1, P2, t, normalize = false) {
        const v0 = { x: P1.x - P0.x, y: P1.y - P0.y };
        const v1 = { x: P2.x - P1.x, y: P2.y - P1.y };
        const Bp = {
            x: 2 * (1 - t) * v0.x + 2 * t * v1.x,
            y: 2 * (1 - t) * v0.y + 2 * t * v1.y
        };

        if (normalize) {
            const len = Math.hypot(Bp.x, Bp.y) || 1;
            return { x: Bp.x / len, y: Bp.y / len };
        }

        return Bp;
    }

    override getModifierHandles(fill: string | number[], strokeColor: string | number[],): Handle[] {
        const handles = super.getSizeModifierHandles(fill, strokeColor);
        handles.push(new Handle(0, 0, 'top', 'radius', fill, strokeColor));
        handles.push(new Handle(0, 0, 'right', 'vertices', fill, strokeColor));
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
        if (!this.resource) return;
        this.setPaint();

        const path = new this.resource.canvasKit.Path();

        if (this.points.length > 3) {
            // Not enough points for a polygon, draw as regular lines
            if (this.bRadius == 0) {
                const [startX, startY] = this.points[0];
                path.moveTo(startX, startY);
                for (let i = 1; i < this.points.length; i++) {
                    const [x, y] = this.points[i];
                    path.lineTo(x, y);
                }
                path.close();
            }
            else {
                // Create rounded polygon
                this.createRoundedPolygonPath(path, this.points, this.bRadius);
            }
        }

        canvas.drawPath(path, this.resource.paint);
        canvas.drawPath(path, this.resource.strokePaint);
        path.delete();
    }

    private createRoundedPolygonPath(path: Path, points: number[][], radius: number): void {
        const numPoints = points.length;

        for (let i = 0; i < numPoints; i++) {
            const prevIndex = (i - 1 + numPoints) % numPoints;
            const currIndex = i;
            const nextIndex = (i + 1) % numPoints;

            const prev = points[prevIndex];
            const curr = points[currIndex];
            const next = points[nextIndex];

            // Calculate vectors from current point to adjacent points
            const vec1 = [prev[0] - curr[0], prev[1] - curr[1]];
            const vec2 = [next[0] - curr[0], next[1] - curr[1]];

            // Calculate lengths
            const len1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
            const len2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);

            // Normalize vectors
            const norm1 = [vec1[0] / len1, vec1[1] / len1];
            const norm2 = [vec2[0] / len2, vec2[1] / len2];

            // Calculate the maximum radius for this corner to avoid overlaps
            const maxRadius = Math.min(len1 / 2, len2 / 2, radius);

            // Calculate start and end points of the arc
            const startPoint = [
                curr[0] + norm1[0] * maxRadius,
                curr[1] + norm1[1] * maxRadius
            ];
            const endPoint = [
                curr[0] + norm2[0] * maxRadius,
                curr[1] + norm2[1] * maxRadius
            ];

            if (i === 0) {
                // Move to the start point of the first arc
                path.moveTo(startPoint[0], startPoint[1]);
            } else {
                // Line to the start point of this arc
                path.lineTo(startPoint[0], startPoint[1]);
            }

            // Add the rounded corner arc
            // Calculate control points for quadratic curve approximation
            const controlPoint = curr;
            path.quadTo(controlPoint[0], controlPoint[1], endPoint[0], endPoint[1]);
        }

        path.close();
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