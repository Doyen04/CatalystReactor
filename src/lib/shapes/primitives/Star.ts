import Handle from '@/lib/modifiers/Handles'
import Shape from '../base/Shape'
import type { Canvas, Path } from 'canvaskit-wasm'
import { Coord, HandlePos, Properties } from '@lib/types/shapes'
import clamp from '@lib/helper/clamp'
import computeRoundedCorner from '@lib/helper/roundingUtil'
import { arcPointAtFraction } from '@lib/helper/pointInArc'
import { ShapeData } from '@lib/core/EngineStateStore'

class Star extends Shape {
    private points: Coord[] = []

    constructor(data: ShapeData) {
        super(data)
        this.points = this.generateStarPoints()
    }

    get radiusX(): number {
        return this.data.properties.size.width / 2
    }

    get radiusY(): number {
        return this.data.properties.size.height / 2
    }

    get spikes(): number {
        return this.data.properties.spikesRatio?.spikes || 5
    }

    get ratio(): number {
        return this.data.properties.spikesRatio?.ratio || 0.5
    }

    get bRadius(): number {
        return this.data.properties.borderRadius?.['top-left'] || 0
    }

    private generateStarPoints(): Coord[] {
        const points: Coord[] = []
        const spikes = this.spikes

        for (let i = 0; i < spikes * 2; i++) {
            const point = this.getVertex(spikes, i)
            points.push(point)
        }

        return points
    }

    override setBorderRadius(newRadius: number, pos: HandlePos) {
        if (pos != 'top') return

        const { width, height } = this.getDim()
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))

        if (!this.data.properties.borderRadius) {
            this.data.properties.borderRadius = {
                'top-left': newRad,
                'top-right': newRad,
                'bottom-left': newRad,
                'bottom-right': newRad,
                locked: true
            }
        } else {
            this.data.properties.borderRadius['top-left'] = newRad // Using top-left as proxy for star radius
            this.data.properties.borderRadius.locked = true
        }
    }

    override setDim(width: number, height: number) {
        this.data.properties.size.width = width
        this.data.properties.size.height = height
        this.points = this.generateStarPoints()
    }

    override setVertexCount(points: number): void {
        if (!this.data.properties.spikesRatio) {
            this.data.properties.spikesRatio = { spikes: clamp(points, 3, 60), ratio: 0.5 }
        } else {
            this.data.properties.spikesRatio.spikes = clamp(points, 3, 60)
        }
        this.points = this.generateStarPoints()
    }

    override setRatio(rat: number) {
        if (!this.data.properties.spikesRatio) {
            this.data.properties.spikesRatio = { spikes: 5, ratio: rat }
        } else {
            this.data.properties.spikesRatio.ratio = rat
        }
        this.points = this.generateStarPoints()
    }

    override getVertex(sides: number, index: number, startAngle = -Math.PI / 2): { x: number; y: number } {
        const angleStep = (Math.PI * 2) / sides
        const angle = index * (angleStep / 2) + startAngle

        const radiusX = index % 2 === 0 ? this.radiusX : this.radiusX * this.ratio
        const radiusY = index % 2 === 0 ? this.radiusY : this.radiusY * this.ratio

        const x = this.radiusX + Math.cos(angle) * radiusX
        const y = this.radiusY + Math.sin(angle) * radiusY

        return { x, y }
    }

    override getVertexCount(): number {
        return this.spikes
    }

    override getDim(): { width: number; height: number } {
        return { 
            width: Math.round(this.data.properties.size.width), 
            height: Math.round(this.data.properties.size.height) 
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
        const spikes = this.spikes
        const bRadius = this.bRadius

        if (this.points.length > 0) {
            if (bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star',
                    1,
                    this.points,
                    spikes * 2,
                    Math.min(bRadius, this.getMaxRadius())
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
        const spikes = this.spikes
        const bRadius = this.bRadius

        if (this.points.length > 0) {
            if (bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star',
                    2,
                    this.points,
                    spikes * 2,
                    Math.min(bRadius, this.getMaxRadius())
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

    override getCenterCoord(): Coord {
        return { x: this.radiusX, y: this.radiusY }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const fill = this.paintManager.initFillPaint(this.data.properties.style.fill, this.getDim())
        const stroke = this.paintManager.initStrokePaint(this.data.properties.style.stroke, this.getDim())

        const path = new this.resource.canvasKit.Path()
        if (this.bRadius > 0) {
            this.createRoundedStarPath(path)
        } else {
            this.createRegularStarPath(path)
        }

        canvas.drawPath(path, fill)
        canvas.drawPath(path, stroke)

        path.delete() // Clean up path object

        this.paintManager.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas)
        }
    }

    protected drawHoverEffect(canvas: Canvas): void {
        if (!this.resource) return
        const { canvasKit } = this.resource
        const path = new canvasKit.Path()

        const hoverPaint = this.paintManager.stroke
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
        if (this.points.length === 0) return
        path.moveTo(this.points[0].x, this.points[0].y)

        for (let i = 1; i < this.points.length; i++) {
            path.lineTo(this.points[i].x, this.points[i].y)
        }
        path.close()
    }

    override getMaxRadius() {
        const outerRadius = Math.min(this.radiusX, this.radiusY) // outer radius
        const ratio = this.ratio
        const phi = Math.PI / this.spikes // half-step angle
        // empirical mapping observed
        const innerRadius = outerRadius * ratio * Math.cos(phi) // inner radius approx
        const L = Math.sqrt(outerRadius * outerRadius + innerRadius * innerRadius - 2 * outerRadius * innerRadius * Math.cos(phi))
        const corner = (L / 2) * Math.tan(phi) // fillet formula
        return corner
    }

    private createRoundedStarPath(path: Path) {
        const spikes = this.spikes
        const bRadius = this.bRadius

        for (let i = 0; i < this.points.length; i++) {
            const { startPoint, endPoint, controlPoint, currentRadius } = computeRoundedCorner(
                'star',
                i,
                this.points,
                spikes * 2,
                Math.min(bRadius, this.getMaxRadius())
            )
            if (i === 0) {
                path.moveTo(startPoint.x, startPoint.y)
            } else {
                path.lineTo(startPoint.x, startPoint.y)
            }

            path.arcToTangent(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y, currentRadius)
        }

        path.close()
        return path
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

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Star
