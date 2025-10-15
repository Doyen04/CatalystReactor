import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { Coord, HandlePos, Properties, Sides } from '@lib/types/shapes'
import Handle from '@lib/modifiers/Handles'
import clamp from '@lib/helper/clamp'
import computeRoundedCorner from '@lib/helper/roundingUtil'
import { arcPointAtFraction } from '@lib/helper/pointInArc'

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

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })
        handles.push(new Handle(0, 0, 'top', 'radius'))
        handles.push(new Handle(0, 0, 'right', 'vertices'))
        return handles
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
        const radius = Math.min(this.bRadius, this.getMaxRadius())

        if (this.points.length > 0) {
            const { x, y } = this.points[0]
            return {
                x: x - size,
                y: y + (handle.isDragging || radius >= padding ? radius : padding),
            }
        }
        return { x: this.radiusX, y: this.radiusY }
    }

    private getVerticesModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        if (this.points.length > 1) {
            if (this.bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'polygon',
                    1,
                    this.points,
                    this.sides.sides,
                    Math.min(this.bRadius, this.getMaxRadius())
                )
                const { x: tangentX, y: tangentY } = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
                return { x: tangentX - size, y: tangentY - size }
            } else {
                const { x, y } = this.points[1]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.radiusX, y: this.radiusY }
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

    getMaxRadius() {
        return Math.min(this.radiusX, this.radiusY) * Math.cos(Math.PI / this.sides.sides)
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

        const fill = this.paintManager.initFillPaint(this.style.fill, this.getDim())
        const stroke = this.paintManager.initStrokePaint(this.style.stroke, this.getDim(), this.style.stroke.width)

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

        this.paintManager.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas)
        }
    }

    private drawHoverEffect(canvas: Canvas): void {
        if (!this.resource) return
        const { canvasKit } = this.resource
        const path = new canvasKit.Path()

        const hoverPaint = this.paintManager.stroke
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

    private createRoundedPolygonPath(path: Path) {
        for (let i = 0; i < this.points.length; i++) {
            const { startPoint, endPoint, controlPoint, currentRadius } = computeRoundedCorner(
                'polygon',
                i,
                this.points,
                this.sides.sides,
                Math.min(this.bRadius, this.getMaxRadius())
            )
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

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Polygon
