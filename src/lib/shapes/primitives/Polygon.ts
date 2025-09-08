import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { Coord, HandlePos, Properties, Sides } from '@lib/types/shapes'
import Handle from '@lib/modifiers/Handles'
import { Points } from '@lib/types/shapeTypes'
import clamp from '@lib/helper/clamp'

class Polygon extends Shape {
    bRadius: number
    sides: Sides
    points: Points[]
    radiusX: number
    radiusY: number

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'polygon', ...shapeProps })
        this.bRadius = 0
        this.sides = { sides: 5 }
        this.radiusX = 0
        this.radiusY = 0
        this.points = this.generateRegularPolygon()
    }

    override moveShape(dx: number, dy: number): void {
        this.transform.x += dx
        this.transform.y += dy

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    setBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return

        const { width, height } = this.getDim()
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))

        this.bRadius = newRad
    }

    override setDim(width: number, height: number) {
        this.radiusX = width / 2
        this.radiusY = height / 2

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y

        this.points = this.generateRegularPolygon()
        this.calculateBoundingRect()
    }

    override setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        const willFlipX = deltaX < 0
        const willFlipY = deltaY < 0

        this.transform.scaleX = willFlipX ? -1 : 1
        this.transform.scaleY = willFlipY ? -1 : 1

        const newRadiusX = Math.abs(deltaX) / 2
        const newRadiusY = Math.abs(deltaY) / 2

        if (shiftKey) {
            const maxRadius = Math.max(newRadiusX, newRadiusY)
            this.radiusX = this.radiusY = maxRadius

            this.transform.x = deltaX >= 0 ? dragStart.x : dragStart.x - maxRadius
            this.transform.y = deltaY >= 0 ? dragStart.y : dragStart.y - maxRadius
        } else {
            this.radiusX = newRadiusX
            this.radiusY = newRadiusY

            this.transform.x = deltaX < 0 ? mx : dragStart.x
            this.transform.y = deltaY < 0 ? my : dragStart.y
        }

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

    override getCenterCoord(): Coord {
        return { x: this.radiusX, y: this.radiusY }
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

    override getModifierHandlesPos(handle: Handle): Coord {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle)
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle)
        } else if (handle.type == 'angle') {
            return super.getAngleModifierHandlesPos(handle)
        }
        return { x: 0, y: 0 }
    }

    private getRadiusModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        const padding = 10
        if (this.points.length > 0) {
            const [x, y] = this.points[0]
            return {
                x: x - size,
                y: y + (handle.isDragging || this.bRadius >= padding ? this.bRadius : padding),
            }
        }
        return { x: this.radiusX, y: this.radiusY }
    }

    private getVerticesModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        if (this.points.length > 1) {
            // If border radius is set, use the tangent point for vertex 1
            if (this.bRadius > 0) {
                const { startPoint, endPoint, controlPoint } = this.computeRoundedCorner(1)
                const startObj = { x: startPoint[0], y: startPoint[1] }
                const endObj = { x: endPoint[0], y: endPoint[1] }
                const controlObj = { x: controlPoint[0], y: controlPoint[1] }
                const { x: tangentX, y: tangentY } = this.computeQuadPoint(startObj, controlObj, endObj, 0.5)

                return { x: tangentX - size, y: tangentY - size }
            } else {
                // No border radius, use raw vertex
                const [x, y] = this.points[1]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.centerX, y: this.centerY }
    }

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })
        handles.push(new Handle(0, 0, 'top', 'radius'))
        handles.push(new Handle(0, 0, 'right', 'vertices'))
        return handles
    }

    override getDim(): { width: number; height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    getVertex(sides: number, index: number, startAngle = -Math.PI / 2) {
        const angleStep = (2 * Math.PI) / sides
        const angle = startAngle + index * angleStep

        const x = this.radiusX + this.radiusX * Math.cos(angle)
        const y = this.radiusY + this.radiusY * Math.sin(angle)

        return { x, y }
    }

    computeQuadPoint(P0: { x: number; y: number }, P1: { x: number; y: number }, P2: { x: number; y: number }, t: number) {
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y
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
        const left = 0
        const top = 0
        const right = this.radiusX * 2
        const bottom = this.radiusY * 2

        this.boundingRect = {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
        }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const { fill, stroke } = this.initPaints()

        const path = new this.resource.canvasKit.Path()

        if (this.points.length >= 3) {
            if (this.bRadius == 0) {
                this.createRegularPolygon(path)
            } else {
                this.createRoundedPolygonPath(path)
            }
        }

        canvas.drawPath(path, fill)
        canvas.drawPath(path, stroke)
        path.delete()

        this.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas)
        }
    }

    private drawHoverEffect(canvas: Canvas): void {
        if (!this.resource) return
        const { canvasKit } = this.resource
        const path = new canvasKit.Path()

        const hoverPaint = this.resource.strokePaint
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1)) // Blue with transparency
        hoverPaint.setStrokeWidth(2)

        if (this.points.length >= 3) {
            if (this.bRadius == 0) {
                this.createRegularPolygon(path)
            } else {
                this.createRoundedPolygonPath(path)
            }
        }
        canvas.drawPath(path, hoverPaint)
        path.delete()
    }

    private createRegularPolygon(path: Path) {
        const [startX, startY] = this.points[0]
        path.moveTo(startX, startY)
        for (let i = 1; i < this.points.length; i++) {
            const [x, y] = this.points[i]
            path.lineTo(x, y)
        }
        path.close()
    }

    createRoundedPolygonPath(path: Path) {
        const n = this.sides.sides
        const R = Math.min(this.radiusX, this.radiusY) / 2
        const { x: cx, y: cy } = this.getCenterCoord()
        const cornerRadius = this.bRadius

        if (n < 3) throw new Error('Polygon must have at least 3 sides')

        // Clamp radius to max possible
        const rMax = R * Math.cos(Math.PI / n)
        const r = Math.min(cornerRadius, rMax)

        const angleStep = (2 * Math.PI) / n
        const vertices = []

        // Compute vertices (circumcircle)
        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + i * angleStep // start at top
            const x = cx + R * Math.cos(angle)
            const y = cy + R * Math.sin(angle)
            vertices.push({ x, y })
        }

        // Start path
        path.moveTo(vertices[0].x, vertices[0].y)

        for (let i = 0; i < n; i++) {
            const p0 = vertices[(i - 1 + n) % n]
            const p1 = vertices[i]
            const p2 = vertices[(i + 1) % n]

            // Direction vectors
            const v1 = { x: p0.x - p1.x, y: p0.y - p1.y }
            const v2 = { x: p2.x - p1.x, y: p2.y - p1.y }

            // Normalize
            const len1 = Math.hypot(v1.x, v1.y)
            const len2 = Math.hypot(v2.x, v2.y)
            v1.x /= len1
            v1.y /= len1
            v2.x /= len2
            v2.y /= len2

            // Angle between edges
            const dot = v1.x * v2.x + v1.y * v2.y
            const angle = Math.acos(dot)

            // Distance to offset along each edge
            const dist = r / Math.tan(angle / 2)

            // Cut points
            const p1a = { x: p1.x + v1.x * dist, y: p1.y + v1.y * dist }
            const p1b = { x: p1.x + v2.x * dist, y: p1.y + v2.y * dist }

            if (i === 0) {
                path.moveTo(p1a.x, p1a.y)
            } else {
                path.lineTo(p1a.x, p1a.y)
            }

            // Arc from p1a → p1b
            path.arcToTangent(p1a.x, p1a.y, p1.x, p1.y, p1b.x, p1b.y, r)
            path.lineTo(p1b.x, p1b.y)
        }

        path.close()
        return path
    }

    private computeRoundedCorner(index: number) {
        const n = this.points.length

        const prev = this.points[(index - 1 + n) % n]
        const curr = this.points[index]
        const next = this.points[(index + 1) % n]

        const vec1 = [curr[0] - prev[0], curr[1] - prev[1]]
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

        // Calculate maximum corner radius based on polygon geometry
        const maxCornerRadius = Math.min(this.radiusX, this.radiusY) * Math.cos(Math.PI / n)

        // Scale the border radius similar to the reference implementation
        // This creates a perfect circle at 1/2 radius
        const scaledRadius = maxCornerRadius * Math.min(1, (this.bRadius / Math.min(this.radiusX, this.radiusY)) * 2)

        // Ensure we don't exceed the edge lengths
        const actualRadius = Math.min(scaledRadius, Math.min(len1 / 2, len2 / 2))

        const startPoint = [curr[0] - norm1[0] * actualRadius, curr[1] - norm1[1] * actualRadius]
        const endPoint = [curr[0] + norm2[0] * actualRadius, curr[1] + norm2[1] * actualRadius]
        const logicalStart = [curr[0] - norm1[0] * Math.min(len1 / 2, len2 / 2), curr[1] - norm1[1] * Math.min(len1 / 2, len2 / 2)]

        return {
            startPoint,
            endPoint,
            controlPoint: curr,
            maxRadius: actualRadius,
            logicalRadius: Math.min(len1 / 2, len2 / 2),
            logicalStart,
        }
    }

    // private createRoundedPolygonPath(path: Path): void {
    //     const numPoints = this.points.length

    //     // Get the first corner to determine starting point
    //     const firstCorner = this.computeRoundedCorner(0)
    //     path.moveTo(firstCorner.startPoint[0], firstCorner.startPoint[1])

    //     for (let i = 0; i < numPoints; i++) {
    //         const corner = this.computeRoundedCorner(i)
    //         console.log(corner)

    //         if (i > 0) {
    //             path.lineTo(corner.startPoint[0], corner.startPoint[1])
    //         }
    //         path.quadTo(corner.controlPoint[0], corner.controlPoint[1], corner.endPoint[0], corner.endPoint[1])
    //     }

    //     path.close()
    // }

    // private computeRoundedCorner(i: number) {
    //     const sides = this.points.length
    //     const prev = this.points[(i - 1 + sides) % sides]
    //     const curr = this.points[i]
    //     const next = this.points[(i + 1) % sides]
    //     const vec1 = { x: curr[0] - prev[0], y: curr[1] - prev[1] }
    //     const vec2 = { x: next[0] - curr[0], y: next[1] - curr[1] }
    //     const len1 = Math.hypot(vec1.x, vec1.y)
    //     const len2 = Math.hypot(vec2.x, vec2.y)

    //     let currCornerRadius = this.bRadius
    //     // if (typeof this.bRadius === 'number') {
    //     //     currCornerRadius = this.bRadius
    //     // } else {
    //     //     currCornerRadius = i < cornerRadius.length ? cornerRadius[i] : 0
    //     // }
    //     const maxCornerRadius = Math.min(this.radiusX, this.radiusY) * Math.cos(Math.PI / sides)
    //     // cornerRadius creates perfect circle at 1/2 radius
    //     currCornerRadius = maxCornerRadius * Math.min(1, (currCornerRadius / Math.min(this.radiusX, this.radiusY)) * 2)

    //     // currCornerRadius = Math.min(currCornerRadius, Math.min(len1 / 2, len2 / 2))

    //     const normalVec1 = { x: vec1.x / len1, y: vec1.y / len1 }
    //     const normalVec2 = { x: vec2.x / len2, y: vec2.y / len2 }
    //     const p1 = {
    //         x: curr[0] - normalVec1.x * currCornerRadius,
    //         y: curr[1] - normalVec1.y * currCornerRadius,
    //     }
    //     const p2 = {
    //         x: curr[0] + normalVec2.x * currCornerRadius,
    //         y: curr[1] + normalVec2.y * currCornerRadius,
    //     }

    //     return {
    //         startPoint: p1,
    //         endPoint: p2,
    //         controlPoint: { x: curr[0], y: curr[1] },
    //     }
    // }

    override pointInShape(x: number, y: number): boolean {
        const pts = this.points
        const n = pts.length
        if (n < 3) return false

        let inside = false
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const [xi, yi] = pts[i]
            const [xj, yj] = pts[j]
            const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

            if (intersects) inside = !inside
        }

        return inside
    }

    override cleanUp(): void {}
    override destroy(): void {}
}

export default Polygon
