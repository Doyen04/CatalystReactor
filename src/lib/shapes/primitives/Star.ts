import Handle from '@/lib/modifiers/Handles'
import Shape from '../base/Shape'
import type { Canvas, Path } from 'canvaskit-wasm'
import { Coord, HandlePos, Properties } from '@lib/types/shapes'
import clamp from '@lib/helper/clamp'
import computeRoundedCorner from '@lib/helper/roundingUtil'
import { arcPointAtFraction } from '@lib/helper/pointInArc'

class Star extends Shape {
    radiusX: number
    radiusY: number
    spikes: number
    ratio: number
    points: Coord[]
    bRadius: number = 0

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'star', ...shapeProps })
        this.radiusX = 0
        this.radiusY = 0
        this.spikes = 5
        this.ratio = 0.5
        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    private generateStarPoints(): Coord[] {
        const points: Coord[] = []

        for (let i = 0; i < this.spikes * 2; i++) {
            const point = this.getVertex(this.spikes, i)
            points.push(point)
        }

        return points
    }

    override moveShape(mx: number, my: number): void {
        this.transform.x += mx
        this.transform.y += my

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    setBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return

        const { width, height } = this.getDim()
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))

        this.bRadius = newRad
    }

    setDim(width: number, height: number) {
        this.radiusX = width / 2
        this.radiusY = height / 2

        this.points = this.generateStarPoints()
        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y

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

    getVertex(sides: number, index: number, startAngle = -Math.PI / 2): { x: number; y: number } {
        const angleStep = (Math.PI * 2) / sides
        const angle = index * (angleStep / 2) + startAngle

        const radiusX = index % 2 === 0 ? this.radiusX : this.radiusX * this.ratio
        const radiusY = index % 2 === 0 ? this.radiusY : this.radiusY * this.ratio

        const x = this.radiusX + Math.cos(angle) * radiusX
        const y = this.radiusY + Math.sin(angle) * radiusY

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

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })
        handles.push(new Handle(0, 0, 'top', 'radius'))
        handles.push(new Handle(0, 0, 'right', 'vertices'))
        handles.push(new Handle(0, 0, 'between', 's-ratio'))
        return handles
    }

    override getModifierHandlesPos(handle: Handle): Coord {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'radius') {
            return this.getRadiusModifierHandlesPos(handle)
        } else if (handle.type === 'vertices') {
            return this.getVerticesModifierHandlesPos(handle)
        } else if (handle.type === 's-ratio') {
            return this.getRatioModifierHandlesPos(handle)
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

    private getRatioModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        if (this.points.length > 0) {
            if (this.bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star',
                    1,
                    this.points,
                    this.spikes * 2,
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

    private getVerticesModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        if (this.points.length > 0) {
            if (this.bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star',
                    2,
                    this.points,
                    this.spikes * 2,
                    Math.min(this.bRadius, this.getMaxRadius()) ///
                )
                const { x: tangentX, y: tangentY } = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
                return { x: tangentX - size, y: tangentY - size }
            } else {
                const { x, y } = this.points[2]
                return { x: x - size, y: y - size }
            }
        }
        return { x: this.radiusX, y: this.radiusY }
    }

    getCenterCoord(): Coord {
        return { x: this.radiusX, y: this.radiusY }
    }
    override getDim(): { width: number; height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const { fill, stroke } = this.initPaints()

        const path = new this.resource.canvasKit.Path()
        if (this.bRadius > 0) {
            this.createRoundedStarPath(path)
        } else {
            this.createRegularStarPath(path)
        }

        canvas.drawPath(path, fill)
        canvas.drawPath(path, stroke)

        path.delete() // Clean up path object

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
                this.createRegularStarPath(path)
            } else {
                this.createRoundedStarPath(path)
            }
        }
        canvas.drawPath(path, hoverPaint)
        path.delete()
    }

    private createRegularStarPath(path: Path) {
        path.moveTo(this.points[0].x, this.points[0].y)

        for (let i = 1; i < this.points.length; i++) {
            path.lineTo(this.points[i].x, this.points[i].y)
        }
        path.close()
    }

    getMaxRadius() {
        const outerRadius = Math.min(this.radiusX, this.radiusY) // outer radius
        const ratio = this.ratio
        const phi = Math.PI / this.spikes // half-step angle
        // empirical mapping observed in
        const innerRadius = outerRadius * ratio * Math.cos(phi) // inner radius approx
        const L = Math.sqrt(outerRadius * outerRadius + innerRadius * innerRadius - 2 * outerRadius * innerRadius * Math.cos(phi))
        const corner = (L / 2) * Math.tan(phi) // fillet formula
        return corner
    }

    private createRoundedStarPath(path: Path) {
        for (let i = 0; i < this.points.length; i++) {
            const { startPoint, endPoint, controlPoint, currentRadius } = computeRoundedCorner(
                'star',
                i,
                this.points,
                this.spikes * 2,
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

    override calculateBoundingRect(): void {
        const maxRadiusX = this.radiusX
        const maxRadiusY = this.radiusY

        const left = 0
        const top = 0
        const right = maxRadiusX * 2
        const bottom = maxRadiusY * 2

        this.boundingRect = { left, top, right, bottom }
    }

    override pointInShape(x: number, y: number): boolean {
        if (this.points.length < 3) return false

        let inside = false

        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const { x: xi, y: yi } = this.points[i]
            const { x: xj, y: yj } = this.points[j]

            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                inside = !inside
            }
        }

        return inside
    }
    override cleanUp(): void {}
    override destroy(): void {}
}

export default Star
