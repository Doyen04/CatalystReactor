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

    override drawModifierHandles(canvas: Canvas, resource: any): void {
        super.drawModifierHandles(canvas, resource)

        if (this.points.length < 3) return

        const cw = resource.canvasKit
        const paint = new cw.Paint()
        paint.setColor(cw.Color(255, 255, 255, 1))
        paint.setStyle(cw.PaintStyle.Fill)

        const stroke = new cw.Paint()
        stroke.setColor(cw.Color(0, 0, 255, 1))
        stroke.setStyle(cw.PaintStyle.Stroke)
        stroke.setStrokeWidth(1.5)

        const drawCircle = (x: number, y: number) => {
            canvas.drawCircle(x, y, 4, paint)
            canvas.drawCircle(x, y, 4, stroke)
        }

        const bRadius = this.bRadius
        const spikes = this.spikes
        const rPos = (idx: number) => {
            if (bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star', idx, this.points, spikes * 2, Math.min(bRadius, this.getMaxRadius())
                )
                const { x, y } = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
                return { x, y }
            }
            return this.points[idx]
        }

        const radiusPt = { x: this.points[0].x, y: this.points[0].y + (bRadius > 0 ? bRadius : 10) }
        const ratioPt = rPos(1)
        const vertPt = rPos(2)

        drawCircle(radiusPt.x, radiusPt.y)
        drawCircle(ratioPt.x, ratioPt.y)
        drawCircle(vertPt.x, vertPt.y)

        paint.delete(); stroke.delete()
    }

    override hitTestModifierHandle(x: number, y: number): string | null {
        const base = super.hitTestModifierHandle(x, y)
        if (base) return base

        if (this.points.length < 3) return null

        const bRadius = this.bRadius
        const spikes = this.spikes
        const rPos = (idx: number) => {
            if (bRadius > 0) {
                const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                    'star', idx, this.points, spikes * 2, Math.min(bRadius, this.getMaxRadius())
                )
                const { x, y } = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
                return { x, y }
            }
            return this.points[idx]
        }

        const radiusPt = { x: this.points[0].x, y: this.points[0].y + (bRadius > 0 ? bRadius : 10) }
        const ratioPt = rPos(1)
        const vertPt = rPos(2)

        const s = 10
        if (Math.abs(x - radiusPt.x) <= s && Math.abs(y - radiusPt.y) <= s) return 'radius-top'
        if (Math.abs(x - ratioPt.x) <= s && Math.abs(y - ratioPt.y) <= s) return 's-ratio'
        if (Math.abs(x - vertPt.x) <= s && Math.abs(y - vertPt.y) <= s) return 'vertices'

        return null
    }

    override dragModifierHandle(handleID: string, localCurrent: Coord, localStart: Coord, initialShapeData: any): void {
        const { width, height } = this.data.properties.size

        if (handleID === 'radius-top') {
            const distY = localCurrent.y - 0 // Bounding rect top is 0
            if (distY >= 0) this.setBorderRadius(Math.abs(distY), 'top' as any)
        } else if (handleID === 's-ratio') {
            const deltaX = localCurrent.x - this.radiusX
            const deltaY = localCurrent.y - this.radiusY
            const deg = Math.atan2(this.radiusX * deltaY, this.radiusY * deltaX)
            const cos = Math.cos(deg); const sin = Math.sin(deg)
            const ellAt = Math.sqrt((this.radiusX * this.radiusX * this.radiusY * this.radiusY) / (this.radiusY * this.radiusY * cos * cos + this.radiusX * this.radiusX * sin * sin))
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            this.setRatio(Math.min(0.99, dist / ellAt))
        } else if (handleID === 'vertices') {
            const count = this.getVertexCount()
            const vx = localCurrent.x
            const vy = localCurrent.y

            const next = clamp(count + 1, 3, 60)
            const prev = clamp(count - 1, 3, 60)
            const GAP = 10

            const { x: px, y: py } = this.getVertex(prev, 2)
            const { x: nx, y: ny } = this.getVertex(next, 2)

            if (vy < ny && (Math.abs(vx - nx) < GAP || Math.abs(vy - ny) < GAP)) {
                this.setVertexCount(next)
            } else if (vy > py && (Math.abs(vx - px) < GAP || Math.abs(vy - py) < GAP)) {
                this.setVertexCount(prev)
            }
        }
    }

    override getCenterCoord(): Coord {
        return { x: this.radiusX, y: this.radiusY }
    }

    override getPath(): Path | null {
        if (!this.resource) return null
        const path = new this.resource.canvasKit.Path()
        if (this.bRadius > 0) {
            this.createRoundedStarPath(path)
        } else {
            this.createRegularStarPath(path)
        }
        return path
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

    override convertToPathData(): any {
        const pointsArray: any[] = []
        for (let i = 0; i < this.points.length; i++) {
            const { x, y } = this.points[i]
            // Note: Bypassing parametric border radius rendering for raw points.
            pointsArray.push({ x, y, smooth: false })
        }
        return { points: pointsArray, closed: true }
    }

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Star
