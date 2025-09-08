import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { Coord, HandlePos, Properties, Sides } from '@lib/types/shapes'
import Handle from '@lib/modifiers/Handles'
import clamp from '@lib/helper/clamp'

class Polygon extends Shape {
    bRadius: number
    sides: Sides
    points: Coord[]
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
            const { x, y } = this.points[0]
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
                const { x, y } = this.points[1]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.radiusX, y: this.radiusY }
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

    private generateRegularPolygon(): Coord[] {
        const points: Coord[] = []

        for (let i = 0; i < this.sides.sides; i++) {
            const point = this.getVertex(this.sides.sides, i)
            points.push(point)
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
        const { x: startX, y: startY } = this.points[0]
        path.moveTo(startX, startY)
        for (let i = 1; i < this.points.length; i++) {
            const { x, y } = this.points[i]
            path.lineTo(x, y)
        }
        path.close()
    }

    // FORMULA FOR CALCULATING CORNER RADIUS
    // const rMax = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2) BEST FOR IRREGULAR SHAPE
    // Const rMax = Math.min(len1, len2) * (1 / Math.tan(angle / 2));
    // Const rMax = Math.min(width, height) / 2 * Math.cos(Math.PI / n);
    // Const rMax =  (sideLength / 2) * (1 / Math.tan(Math.PI / n))

    private computeRoundedCorner(i: number) {
        const n = this.sides.sides

        if (n < 3) throw new Error('Polygon must have at least 3 sides')

        const vertices = this.points
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

        const rInside = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2)

        const r = Math.min(rInside, this.bRadius)
        // Distance to offset along each edge
        const dist = r / Math.tan(angle / 2)

        // Cut points
        const p1a = { x: p1.x + v1.x * dist, y: p1.y + v1.y * dist }
        const p1b = { x: p1.x + v2.x * dist, y: p1.y + v2.y * dist }

        return {
            startPoint: p1a,
            endPoint: p1b,
            controlPoint: p1,
            currentRadius: r,
            maxRadius: r, //work on this
        }
    }

    createRoundedPolygonPath(path: Path) {
        for (let i = 0; i < this.points.length; i++) {
            const { startPoint, endPoint, controlPoint, currentRadius } = this.computeRoundedCorner(i)
            if (i === 0) {
                path.moveTo(startPoint.x, startPoint.y)
            } else {
                path.lineTo(startPoint.x, startPoint.y)
            }

            // Arc from p1a → p1b
            path.arcToTangent(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y, currentRadius)
        }

        path.close()
        return path
    }

    override pointInShape(x: number, y: number): boolean {
        const pts = this.points
        const n = pts.length
        if (n < 3) return false

        let inside = false
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const { x: xi, y: yi } = pts[i]
            const { x: xj, y: yj } = pts[j]
            const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

            if (intersects) inside = !inside
        }

        return inside
    }

    override cleanUp(): void {}
    override destroy(): void {}
}

export default Polygon
