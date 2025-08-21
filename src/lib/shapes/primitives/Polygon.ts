import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { HandlePos, Properties, Sides } from '@lib/types/shapes'
import Handle from '@lib/modifiers/Handles'
import { Points } from '@lib/types/shapeTypes'
import clamp from '@lib/helper/clamp'

class Polygon extends Shape {
    centerX: number
    centerY: number
    bRadius: number
    sides: Sides
    points: Points[]
    radiusX: number
    radiusY: number

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'polygon', ...shapeProps })
        this.centerX = 0
        this.centerY = 0
        this.bRadius = 0
        this.sides = { sides: 5 }
        this.radiusX = 0
        this.radiusY = 0
        this.points = this.generateRegularPolygon()
    }

    override moveShape(dx: number, dy: number): void {
        this.transform.x += dx
        this.transform.y += dy
        this.centerX += dx
        this.centerY += dy

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    updateBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return

        const { width, height } = this.getDim()
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))

        this.bRadius = newRad
    }

    override setDim(width: number, height: number) {
        this.radiusX = width / 2
        this.radiusY = height / 2

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.points = this.generateRegularPolygon()
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
            this.radiusX = newRadiusX
            this.radiusY = newRadiusY
        }

        this.transform.x = this.centerX - this.radiusX
        this.transform.y = this.centerY - this.radiusY

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    setVertexCount(sides: number) {
        sides = clamp(sides, 3, 60)
        this.sides = { sides }
        this.points = this.generateRegularPolygon()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.setDim(prop.size.width, prop.size.height)
        this.style = prop.style
        console.log(prop, 'inside poly')
        this.setVertexCount(prop.sides.sides)
    }

    override getProperties(): Properties {
        return {
            transform: this.transform,
            size: this.getDim(),
            style: this.style,
            sides: this.sides,
        }
    }
    getVertexCount(): number {
        return this.sides.sides
    }
    override getModifierHandlesPos(handle: Handle): { x: number; y: number } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle)
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle)
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

    private getVerticesModifierHandlesPos(handle: Handle): {
        x: number
        y: number
    } {
        const size = handle.size
        if (this.points.length > 1) {
            // If border radius is set, use the tangent point for vertex 1
            if (this.bRadius > 0) {
                const i = 1
                const { startPoint, endPoint, controlPoint } =
                    this.computeRoundedCorner(i)
                const startObj = { x: startPoint[0], y: startPoint[1] }
                const endObj = { x: endPoint[0], y: endPoint[1] }
                const controlObj = { x: controlPoint[0], y: controlPoint[1] }
                const { x: tangentX, y: tangentY } = this.computeQuadPoint(
                    startObj,
                    controlObj,
                    endObj,
                    0.5
                )

                return { x: tangentX - size, y: tangentY - size }
            } else {
                // No border radius, use raw vertex
                const [x, y] = this.points[1]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.centerX, y: this.centerY }
    }

    computeQuadPoint(
        P0: { x: number; y: number },
        P1: { x: number; y: number },
        P2: { x: number; y: number },
        t: number
    ) {
        const x =
            (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x
        const y =
            (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y
        return { x, y }
    }

    override getModifierHandles(
        fill: string | number[],
        strokeColor: string | number[]
    ): Handle[] {
        const handles = super.getSizeModifierHandles(fill, strokeColor)
        handles.push(new Handle(0, 0, 'top', 'radius', fill, strokeColor))
        handles.push(new Handle(0, 0, 'right', 'vertices', fill, strokeColor))
        return handles
    }

    override getDim(): { width: number; height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    getVertex(sides: number, index: number, startAngle = -Math.PI / 2) {
        const angleStep = (2 * Math.PI) / sides
        const angle = startAngle + index * angleStep

        const x = this.centerX + this.radiusX * Math.cos(angle)
        const y = this.centerY + this.radiusY * Math.sin(angle)

        return { x, y }
    }

    private generateRegularPolygon(): Points[] {
        const points: Points[] = []

        for (let i = 0; i < this.sides.sides; i++) {
            const { x, y } = this.getVertex(this.sides.sides, i)
            const res: Points = [x, y]
            points.push(res)
        }

        return points
    }

    override calculateBoundingRect(): void {
        const left = this.transform.x
        const top = this.transform.y
        const right = this.transform.x + this.radiusX * 2
        const bottom = this.transform.y + this.radiusY * 2

        this.boundingRect = {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
        }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return
        this.setPaint()

        const path = new this.resource.canvasKit.Path()

        if (this.points.length >= 3) {
            // Not enough points for a polygon, draw as regular lines
            if (this.bRadius == 0) {
                const [startX, startY] = this.points[0]
                path.moveTo(startX, startY)
                for (let i = 1; i < this.points.length; i++) {
                    const [x, y] = this.points[i]
                    path.lineTo(x, y)
                }
                path.close()
            } else {
                // Create rounded polygon
                this.createRoundedPolygonPath(path)
            }
        }

        canvas.drawPath(path, this.resource.paint)
        canvas.drawPath(path, this.resource.strokePaint)
        path.delete()
    }

    private computeRoundedCorner(index: number) {
        const n = this.points.length

        const prev = this.points[(index - 1 + n) % n]
        const curr = this.points[index]
        const next = this.points[(index + 1) % n]

        const vec1 = [prev[0] - curr[0], prev[1] - curr[1]]
        const vec2 = [next[0] - curr[0], next[1] - curr[1]]

        const len1 = Math.hypot(vec1[0], vec1[1])
        const len2 = Math.hypot(vec2[0], vec2[1])
        if (len1 === 0 || len2 === 0) {
            return {
                startPoint: curr,
                endPoint: curr,
                controlPoint: curr,
                maxRadius: 0,
                logicalRadius: 0,
                logicalStart: curr,
            }
        }

        const norm1 = [vec1[0] / len1, vec1[1] / len1]
        const norm2 = [vec2[0] / len2, vec2[1] / len2]

        const dot = norm1[0] * norm2[0] + norm1[1] * norm2[1]
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)))

        // Use angle-based maximum for better visual results
        const logicalRadius = Math.min(len1 / 2, len2 / 2)
        const halfAngle = angle / 2
        const maxRadius = Math.min(
            this.bRadius,
            Math.min(len1 / 2, len2 / 2) * Math.tan(halfAngle)
        )

        const startPoint = [
            curr[0] + norm1[0] * maxRadius,
            curr[1] + norm1[1] * maxRadius,
        ]
        const endPoint = [
            curr[0] + norm2[0] * maxRadius,
            curr[1] + norm2[1] * maxRadius,
        ]
        const logicalStart = [
            curr[0] + norm1[0] * logicalRadius,
            curr[1] + norm1[1] * logicalRadius,
        ]
        return {
            startPoint,
            endPoint,
            controlPoint: curr,
            maxRadius,
            logicalRadius,
            logicalStart,
        }
    }

    private createRoundedPolygonPath(path: Path): void {
        const numPoints = this.points.length

        const firstCorner = this.computeRoundedCorner(0)

        if (firstCorner.maxRadius >= firstCorner.logicalRadius) {
            path.moveTo(
                firstCorner.logicalStart[0],
                firstCorner.logicalStart[1]
            )
        } else {
            path.moveTo(firstCorner.startPoint[0], firstCorner.startPoint[1])
        }

        for (let i = 0; i < numPoints; i++) {
            const { controlPoint, maxRadius } = this.computeRoundedCorner(i)
            const nextIndex = (i + 1) % numPoints
            const nextCorner = this.computeRoundedCorner(nextIndex)
            path.arcToTangent(
                controlPoint[0],
                controlPoint[1],
                nextCorner.startPoint[0],
                nextCorner.startPoint[1],
                maxRadius
            )
        }

        path.close()
    }

    override pointInShape(x: number, y: number): boolean {
        const pts = this.points
        const n = pts.length
        if (n < 3) return false

        let inside = false
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const [xi, yi] = pts[i]
            const [xj, yj] = pts[j]
            const intersects =
                yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

            if (intersects) inside = !inside
        }

        return inside
    }

    override cleanUp(): void {}
    override destroy(): void {}
}

export default Polygon
