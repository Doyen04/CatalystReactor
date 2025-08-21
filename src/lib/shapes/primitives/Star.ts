import Handle from '@/lib/modifiers/Handles'
import Shape from '../base/Shape'
import type { Canvas, Path } from 'canvaskit-wasm'
import { HandlePos, Properties } from '@lib/types/shapes'
import { Points } from '@lib/types/shapeTypes'
import clamp from '@lib/helper/clamp'
import computeArcPoint from '@lib/helper/pointInArc'

class Star extends Shape {
    radiusX: number
    radiusY: number
    spikes: number
    centerX: number
    centerY: number
    ratio: number
    points: Points[]
    bRadius: number = 5
    allowedRadius: number = 0

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'star', ...shapeProps })
        this.radiusX = 0
        this.radiusY = 0
        this.spikes = 5
        this.ratio = 0.5
        this.centerX = 0
        this.centerY = 0
        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    private generateStarPoints(): Points[] {
        const points: Points[] = []

        for (let i = 0; i < this.spikes * 2; i++) {
            const { x, y } = this.getVertex(this.spikes, i)
            points.push([x, y])
        }

        return points
    }

    override moveShape(mx: number, my: number): void {
        this.transform.x += mx
        this.transform.y += my
        this.centerX += mx
        this.centerY += my

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    updateBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return

        const { width, height } = this.getDim()
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))

        this.bRadius = newRad
    }

    setDim(width: number, height: number) {
        this.radiusX = width / 2
        this.radiusY = height / 2

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y
        this.centerX = x + this.radiusX
        this.centerY = y + this.radiusY

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    override setSize(
        dragStart: { x: number; y: number },
        mx: number,
        my: number,
        shiftKey: boolean
    ): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        this.centerX = (dragStart.x + mx) / 2
        this.centerY = (dragStart.y + my) / 2

        const newRadiusX = Math.abs(deltaX) / 2
        const newRadiusY = Math.abs(deltaY) / 2

        if (shiftKey) {
            const maxRadius = Math.max(newRadiusX, newRadiusY)
            this.radiusX = this.radiusY = maxRadius

            this.centerX = dragStart.x + (deltaX >= 0 ? maxRadius : -maxRadius)
            this.centerY = dragStart.y + (deltaY >= 0 ? maxRadius : -maxRadius)
        } else {
            // Free form star - use actual dimensions
            this.radiusX = newRadiusX
            this.radiusY = newRadiusY
        }

        // Update position for bounding calculations
        this.transform.x = this.centerX - this.radiusX
        this.transform.y = this.centerY - this.radiusY

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    setVertexCount(points: number): void {
        this.spikes = clamp(points, 3, 60)

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    setRotation(rotation: number): void {
        this.transform.rotation = rotation % 360
    }

    setRatio(rat: number) {
        this.ratio = rat
        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.setDim(prop.size.width, prop.size.height)
        this.style = prop.style
        this.setVertexCount(prop.spikesRatio.spikes)
        this.setRatio(prop.spikesRatio.ratio)
    }

    getVertex(
        sides: number,
        index: number,
        startAngle = -Math.PI / 2
    ): { x: number; y: number } {
        const angleStep = (Math.PI * 2) / sides
        const angle = index * (angleStep / 2) + startAngle

        const radiusX =
            index % 2 === 0 ? this.radiusX : this.radiusX * this.ratio
        const radiusY =
            index % 2 === 0 ? this.radiusY : this.radiusY * this.ratio

        const x = this.centerX + Math.cos(angle) * radiusX
        const y = this.centerY + Math.sin(angle) * radiusY

        return { x, y }
    }

    getVertexCount(): number {
        return this.spikes
    }

    override getProperties(): Properties {
        return {
            transform: this.transform,
            size: this.getDim(),
            style: this.style,
            spikesRatio: { spikes: this.spikes, ratio: this.ratio },
        }
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle)
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle)
        } else if (handle.type === 's-ratio') {
            return this.getRatioModifierHandlesPos(handle)
        }
        return { x: 0, y: 0 }
    }

    private getRadiusModifierHandlesPos(handle: Handle): {
        x: number
        y: number
    } {
        const size = handle.size
        const padding = 10
        if (this.points.length > 0) {
            const [x, y] = this.points[0]
            return {
                x: x - size,
                y:
                    y +
                    (handle.isDragging || this.bRadius >= padding
                        ? this.bRadius
                        : padding),
            }
        }
        return { x: this.centerX, y: this.centerY }
    }

    private getRatioModifierHandlesPos(handle: Handle): {
        x: number
        y: number
    } {
        const size = handle.size
        if (this.points.length > 0) {
            if (this.bRadius > 0) {
                const i = 1
                const array = this.calculateRoundedCornerData() //work better with rounded corners
                const center = { x: array[i].center[0], y: array[i].center[1] }
                const { x: tangentX, y: tangentY } = computeArcPoint(
                    center,
                    array[i].radius,
                    array[i].startAngle,
                    array[i].sweepAngle,
                    0.5
                )
                return { x: tangentX - size, y: tangentY - size }
            } else {
                const [x, y] = this.points[1]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.centerX, y: this.centerY }
    }

    private getVerticesModifierHandlesPos(handle: Handle): {
        x: number
        y: number
    } {
        const size = handle.size
        if (this.points.length > 0) {
            if (this.bRadius > 0) {
                const i = 2
                const array = this.calculateRoundedCornerData() //work better with rounded corners
                const center = { x: array[i].center[0], y: array[i].center[1] }
                const { x: tangentX, y: tangentY } = computeArcPoint(
                    center,
                    array[i].radius,
                    array[i].startAngle,
                    array[i].sweepAngle,
                    0.5
                )
                return { x: tangentX - size, y: tangentY - size }
            } else {
                const [x, y] = this.points[2]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.centerX, y: this.centerY }
    }

    override getModifierHandles(
        fill: string | number[],
        strokeColor: string | number[]
    ): Handle[] {
        const handles = super.getSizeModifierHandles(fill, strokeColor)
        handles.push(new Handle(0, 0, 'top', 'radius', fill, strokeColor))
        handles.push(new Handle(0, 0, 'right', 'vertices', fill, strokeColor))
        handles.push(new Handle(0, 0, 'between', 's-ratio', fill, strokeColor))
        return handles
    }

    getCenterCoord(): { x: number; y: number } {
        return { x: this.centerX, y: this.centerY }
    }
    override getDim(): { width: number; height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        this.setPaint()
        const path = new this.resource.canvasKit.Path()
        if (this.bRadius > 0) {
            this.createRoundedStarPath(path)
        } else {
            path.moveTo(this.points[0][0], this.points[0][1])

            for (let i = 1; i < this.points.length; i++) {
                path.lineTo(this.points[i][0], this.points[i][1])
            }
            path.close()
        }

        canvas.drawPath(path, this.resource.paint)
        canvas.drawPath(path, this.resource.strokePaint)

        path.delete() // Clean up path object
    }

    // private computeRoundedCorner(index: number) {
    //     const n = this.points.length;

    //     const prev = this.points[(index - 1 + n) % n];
    //     const curr = this.points[index];
    //     const next = this.points[(index + 1) % n];

    //     const vec1 = [prev[0] - curr[0], prev[1] - curr[1]];
    //     const vec2 = [next[0] - curr[0], next[1] - curr[1]];

    //     const len1 = Math.hypot(vec1[0], vec1[1]);
    //     const len2 = Math.hypot(vec2[0], vec2[1]);
    //     if (len1 === 0 || len2 === 0) {
    //         return {
    //             startPoint: curr,
    //             endPoint: curr,
    //             controlPoint: curr,
    //             maxRadius: 0,
    //             logicalRadius: 0,
    //             logicalStart: curr
    //         };
    //     }

    //     const norm1 = [vec1[0] / len1, vec1[1] / len1];
    //     const norm2 = [vec2[0] / len2, vec2[1] / len2];

    //     const logicalRadius = Math.min(len1 / 2, len2 / 2) || 0;

    //     const dot = norm1[0] * norm2[0] + norm1[1] * norm2[1];
    //     const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    //     // const halfAngle = angle / 2;
    //     //The maximum radius is proportional to the shorter edge length, scaled by how 'sharp' the angle is.
    //     const maxAllowedRadius = Math.min(len1, len2) * Math.sin(angle) / 2;
    //     const maxRadius = Math.min(this.bRadius, maxAllowedRadius);

    //     const startPoint = [
    //         curr[0] + norm1[0] * maxRadius,
    //         curr[1] + norm1[1] * maxRadius
    //     ];
    //     const endPoint = [
    //         curr[0] + norm2[0] * maxRadius,
    //         curr[1] + norm2[1] * maxRadius
    //     ];
    //     const logicalStart = [
    //         curr[0] + norm1[0] * logicalRadius,
    //         curr[1] + norm1[1] * logicalRadius
    //     ];
    //     return { startPoint, endPoint, controlPoint: curr, maxRadius, logicalRadius, logicalStart };
    // }

    // private createRoundedStarPath(path: Path): void {
    //     if (this.points.length < 3) return;
    //     const cornerData = this.points.map((_, i) => this.computeRoundedCorner(i));
    //     path.moveTo(cornerData[0].startPoint[0], cornerData[0].startPoint[1]);
    //     for (let i = 0; i < cornerData.length; i++) {
    //         const corner = cornerData[i];
    //         const nextCorner = cornerData[(i + 1) % cornerData.length];
    //         const rad = (i % 2 === 0) ? corner.maxRadius : nextCorner.maxRadius

    //         // path.lineTo(corner.startPoint[0], corner.startPoint[1]);
    //         path.arcToTangent(
    //             corner.controlPoint[0],
    //             corner.controlPoint[1],
    //             nextCorner.startPoint[0],
    //             nextCorner.startPoint[1],
    //             rad
    //         );
    //     }
    // }

    private asVec(p: [number, number], pp: [number, number]) {
        const v = { x: 0, y: 0, len: 0, nx: 0, ny: 0, ang: 0 }
        v.x = pp[0] - p[0]
        v.y = pp[1] - p[1]
        v.len = Math.sqrt(v.x * v.x + v.y * v.y)
        v.nx = v.x / v.len
        v.ny = v.y / v.len
        v.ang = Math.atan2(v.ny, v.nx)
        return v
    }

    private calculateRoundedCornerData(): Array<{
        center: [number, number]
        startAngle: number
        sweepAngle: number
        radius: number
        startPoint: [number, number]
    }> {
        if (this.points.length < 3) return []

        const len = this.points.length
        const cornerData: Array<{
            center: [number, number]
            startAngle: number
            sweepAngle: number
            radius: number
            startPoint: [number, number]
        }> = []

        let p1: [number, number], p2: [number, number], p3: [number, number]
        let sinA: number,
            sinA90: number,
            radDirection: number,
            drawDirection: boolean,
            angle: number,
            halfAngle: number
        let cRadius: number, lenOut: number, x: number, y: number

        p1 = this.points[len - 1]

        for (let i = 0; i < len; i++) {
            p2 = this.points[i % len]
            p3 = this.points[(i + 1) % len]

            // Get vectors
            const v1 = this.asVec(p2, p1)
            const v2 = this.asVec(p2, p3)

            // Cross product calculations
            sinA = v1.nx * v2.ny - v1.ny * v2.nx
            sinA90 = v1.nx * v2.nx - v1.ny * -v2.ny
            angle = Math.asin(sinA < -1 ? -1 : sinA > 1 ? 1 : sinA)

            // Determine drawing direction and radius direction
            radDirection = 1
            drawDirection = false
            if (sinA90 < 0) {
                if (angle < 0) {
                    angle = Math.PI + angle
                } else {
                    angle = Math.PI - angle
                    radDirection = -1
                    drawDirection = true
                }
            } else {
                if (angle > 0) {
                    radDirection = -1
                    drawDirection = true
                }
            }

            const dot = v1.nx * v2.nx + v1.ny * v2.ny
            const angle2 = Math.acos(Math.max(-1, Math.min(1, dot)))

            //The maximum radius is proportional to the shorter edge length, scaled by how 'sharp' the angle is.
            const maxAllowedRadius =
                (Math.min(v1.len, v2.len) * Math.sin(angle2)) / 2
            cRadius = Math.min(this.bRadius, maxAllowedRadius)

            // Calculate distances and positions
            halfAngle = angle2 / 2
            lenOut = Math.abs(
                (Math.cos(halfAngle) * cRadius) / Math.sin(halfAngle)
            )

            if (lenOut > Math.min(v1.len, v2.len) / 2) {
                lenOut = Math.min(v1.len, v2.len) / 2
                cRadius = Math.abs(
                    (lenOut * Math.sin(halfAngle)) / Math.cos(halfAngle)
                )
            }
            // Calculate arc center
            x = p2[0] + v2.nx * lenOut
            y = p2[1] + v2.ny * lenOut
            x += -v2.ny * cRadius * radDirection
            y += v2.nx * cRadius * radDirection

            // Calculate start and end angles
            const startAngle = v1.ang + (Math.PI / 2) * radDirection
            const endAngle = v2.ang - (Math.PI / 2) * radDirection

            const startX = x + Math.cos(startAngle) * cRadius
            const startY = y + Math.sin(startAngle) * cRadius

            // Calculate sweep angle
            let sweepAngle = endAngle - startAngle
            if (drawDirection) {
                // Counter-clockwise
                if (sweepAngle > 0) sweepAngle -= 2 * Math.PI
            } else {
                // Clockwise
                if (sweepAngle < 0) sweepAngle += 2 * Math.PI
            }

            cornerData.push({
                center: [x, y],
                startAngle: startAngle,
                sweepAngle: sweepAngle,
                radius: cRadius,
                startPoint: [startX, startY],
            })

            p1 = p2
        }

        return cornerData
    }

    private createRoundedStarPath(path: Path): void {
        const cornerData = this.calculateRoundedCornerData()
        path.moveTo(cornerData[0].startPoint[0], cornerData[0].startPoint[1])

        for (let i = 0; i < cornerData.length; i++) {
            const corner = cornerData[i]
            const nextCorner = cornerData[(i + 1) % cornerData.length]
            const endAngleRad = corner.startAngle + corner.sweepAngle
            const isCCW = corner.sweepAngle < 0

            // Draw the arc - this will automatically connect to current path position
            path.arc(
                corner.center[0],
                corner.center[1],
                corner.radius,
                corner.startAngle,
                endAngleRad,
                isCCW
            )
            path.lineTo(nextCorner.startPoint[0], nextCorner.startPoint[1])
        }

        path.close()
    }

    override calculateBoundingRect(): void {
        const maxRadiusX = this.radiusX
        const maxRadiusY = this.radiusY

        const left = this.centerX - maxRadiusX
        const top = this.centerY - maxRadiusY
        const right = this.centerX + maxRadiusX
        const bottom = this.centerY + maxRadiusY

        this.boundingRect = { left, top, right, bottom }
    }

    override pointInShape(x: number, y: number): boolean {
        if (this.points.length < 3) return false

        let inside = false

        for (
            let i = 0, j = this.points.length - 1;
            i < this.points.length;
            j = i++
        ) {
            const [xi, yi] = this.points[i]
            const [xj, yj] = this.points[j]

            if (
                yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
            ) {
                inside = !inside
            }
        }

        return inside
    }
    override cleanUp(): void {}
    override destroy(): void {}
}

export default Star
