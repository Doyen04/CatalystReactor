import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { Coord, HandlePos, Properties, Sides } from '@lib/types/shapes'
import Handle from '@lib/modifiers/Handles'
import clamp from '@lib/helper/clamp'
import Vector from '@lib/helper/vector'

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
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = this.computeRoundedCorner(1)
                const { x: tangentX, y: tangentY } = this.arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
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

    /**
    FORMULA FOR CALCULATING CORNER RADIUS
    const rMax = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2) BEST FOR IRREGULAR SHAPE
    const rMax = Math.min(len1, len2) * (1 / Math.tan(angle / 2));
    const rMax = Math.min(width, height) / 2 * Math.cos(Math.PI / n);
    const rMax =  (sideLength / 2) * (1 / Math.tan(Math.PI / n)) 
    **/
    private computeRoundedCorner(i: number) {
        const n = this.sides.sides

        if (n < 3) throw new Error('Polygon must have at least 3 sides')

        const rMax = Math.min(this.radiusX, this.radiusY) * Math.cos(Math.PI / n)

        const vertices = this.points
        const startPoint = vertices[(i - 1 + n) % n]
        const controlPoint = vertices[i]
        const endPoint = vertices[(i + 1) % n]

        // Direction vectors
        const v1 = Vector.subtract(startPoint, controlPoint)
        const v2 = Vector.subtract(endPoint, controlPoint)

        const len1 = Vector.length(v1)
        const len2 = Vector.length(v2)

        // Normalize
        const normStart = Vector.normalize(v1)
        const normEnd = Vector.normalize(v2)

        // Angle between edges
        const dot = Vector.dot(normStart, normEnd)
        const angle = Math.acos(dot)

        const rInside = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2)

        const r = Math.min(rInside, this.bRadius)

        // Distance to offset along each edge
        const dist = r / Math.tan(angle / 2)

        // Cut points
        const arcStart = Vector.add(controlPoint, Vector.scale(normStart, dist))
        const arcEnd = Vector.add(controlPoint, Vector.scale(normEnd, dist))

        const turnSign = Math.sign(Vector.cross(normStart, normEnd)) || 1 // orientation of the corner
        const startNormal = turnSign > 0 ? Vector.leftNormal(normStart) : Vector.rightNormal(normStart)
        const endNormal = turnSign > 0 ? Vector.rightNormal(normEnd) : Vector.leftNormal(normEnd)

        const centerCandidateFromStart = Vector.add(arcStart, Vector.scale(Vector.normalize(startNormal), r))
        const centerCandidateFromEnd = Vector.add(arcEnd, Vector.scale(Vector.normalize(endNormal), r))
        const arcCenter = {
            x: (centerCandidateFromStart.x + centerCandidateFromEnd.x) * 0.5,
            y: (centerCandidateFromStart.y + centerCandidateFromEnd.y) * 0.5,
        }

        return {
            startPoint: arcStart,
            endPoint: arcEnd,
            controlPoint: controlPoint,
            currentRadius: r,
            maxRadius: rMax, //work on this
            arcCenter: arcCenter,
            turnSign: turnSign,
        }
    }

    getArcParameters(startPoint: Coord, endPoint: Coord, arcCenter: Coord, currentRadius: number, turnSign: number) {
        function normalizeAngle(angle: number) {
            while (angle <= -Math.PI) angle += Math.PI * 2
            while (angle > Math.PI) angle -= Math.PI * 2
            return angle
        }

        const a1 = Math.atan2(startPoint.y - arcCenter.y, startPoint.x - arcCenter.x)
        const a2 = Math.atan2(endPoint.y - arcCenter.y, endPoint.x - arcCenter.x)
        let delta = normalizeAngle(a2 - a1)

        // Enforce arcTo fillet direction: left turn => CW (delta <= 0), right turn => CCW (delta >= 0)
        if (turnSign > 0 && delta > 0) delta -= Math.PI * 2
        if (turnSign < 0 && delta < 0) delta += Math.PI * 2

        return { center: arcCenter, radius: currentRadius, startAngle: a1, deltaAngle: delta }
    }

    arcPointAtFraction(startPoint: Coord, endPoint: Coord, arcCenter: Coord, currentRadius: number, turnSign: number, t: number) {
        const params = this.getArcParameters(startPoint, endPoint, arcCenter, currentRadius, turnSign)
        const clamped = Math.max(0, Math.min(1, t))
        const theta = params.startAngle + clamped * params.deltaAngle
        return { x: params.center.x + params.radius * Math.cos(theta), y: params.center.y + params.radius * Math.sin(theta) }
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
