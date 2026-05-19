import type { Canvas, Path } from 'canvaskit-wasm'
import Shape from '../base/Shape'
import { Coord, HandlePos, Properties, Sides } from '@lib/types/shapes'
import clamp from '@lib/helper/clamp'
import computeRoundedCorner from '@lib/helper/roundingUtil'
import { arcPointAtFraction } from '@lib/helper/pointInArc'
import { ShapeData } from '@lib/core/EngineStateStore'

class Polygon extends Shape {
    private points: Coord[] = []

    constructor(data: ShapeData) {
        super(data)
        this.points = this.generateRegularPolygon()
    }

    get radiusX(): number {
        return this.data.properties.size.width / 2
    }

    get radiusY(): number {
        return this.data.properties.size.height / 2
    }

    get sides(): number {
        return this.data.properties.sides?.sides || 5
    }

    get bRadius(): number {
        return this.data.properties.borderRadius?.['top-left'] || 0
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
            this.data.properties.borderRadius['top-left'] = newRad
            this.data.properties.borderRadius.locked = true
        }
    }

    override setDim(width: number, height: number) {
        this.data.properties.size.width = width
        this.data.properties.size.height = height
        this.points = this.generateRegularPolygon()
    }

    override setVertexCount(sides: number) {
        const s = clamp(sides, 3, 60)
        if (!this.data.properties.sides) {
            this.data.properties.sides = { sides: s }
        } else {
            this.data.properties.sides.sides = s
        }
        this.points = this.generateRegularPolygon()
    }

    override getCenterCoord(): Coord {
        return { x: this.radiusX, y: this.radiusY }
    }

    override getVertexCount(): number {
        return this.sides
    }

    override getDim(): { width: number; height: number } {
        return { 
            width: Math.round(this.data.properties.size.width), 
            height: Math.round(this.data.properties.size.height) 
        }
    }

    override drawModifierHandles(canvas: Canvas, resource: any): void {
        super.drawModifierHandles(canvas, resource)

        if (this.points.length < 2) return
        
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
        const spikes = this.sides
        
        let radiusY = this.points[0].y + (bRadius > 0 ? bRadius : 10)
        
        let vertPt = this.points[1]
        if (bRadius > 0) {
            const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                'polygon', 1, this.points, spikes, Math.min(bRadius, this.getMaxRadius())
            )
            vertPt = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
        }

        drawCircle(this.points[0].x, radiusY)
        drawCircle(vertPt.x, vertPt.y)

        paint.delete(); stroke.delete()
    }

    override hitTestModifierHandle(x: number, y: number): string | null {
        const base = super.hitTestModifierHandle(x, y)
        if (base) return base

        if (this.points.length < 2) return null

        const bRadius = this.bRadius
        const spikes = this.sides
        
        let radiusY = this.points[0].y + (bRadius > 0 ? bRadius : 10)
        let vertPt = this.points[1]
        
        if (bRadius > 0) {
            const { startPoint, endPoint, arcCenter, currentRadius, turnSign } = computeRoundedCorner(
                'polygon', 1, this.points, spikes, Math.min(bRadius, this.getMaxRadius())
            )
            vertPt = arcPointAtFraction(startPoint, endPoint, arcCenter, currentRadius, turnSign, 0.5)
        }

        const s = 10
        if (Math.abs(x - this.points[0].x) <= s && Math.abs(y - radiusY) <= s) return 'radius-top'
        if (Math.abs(x - vertPt.x) <= s && Math.abs(y - vertPt.y) <= s) return 'vertices'

        return null
    }

    override dragModifierHandle(handleID: string, localCurrent: Coord, localStart: Coord, initialShapeData: any): void {
        const { width, height } = this.data.properties.size
        
        if (handleID === 'radius-top') {
            let distY = localCurrent.y - 0
            if (distY >= 0) this.setBorderRadius(Math.abs(distY), 'top' as any)
        } else if (handleID === 'vertices') {
            const count = this.getVertexCount()
            const vx = localCurrent.x
            const vy = localCurrent.y

            const next = clamp(count + 1, 3, 60)
            const prev = clamp(count - 1, 3, 60)
            const GAP = 10

            const { x: px, y: py } = this.getVertex(prev, 1)
            const { x: nx, y: ny } = this.getVertex(next, 1)
            
            if (vy < ny && (Math.abs(vx - nx) < GAP || Math.abs(vy - ny) < GAP)) {
                this.setVertexCount(next)
            } else if (vy > py && (Math.abs(vx - px) < GAP || Math.abs(vy - py) < GAP)) {
                this.setVertexCount(prev)
            }
        }
    }

    override getVertex(sides: number, index: number, startAngle = -Math.PI / 2) {
        const angleStep = (2 * Math.PI) / sides
        const angle = startAngle + index * angleStep

        const x = this.radiusX + this.radiusX * Math.cos(angle)
        const y = this.radiusY + this.radiusY * Math.sin(angle)

        return { x, y }
    }

    override getMaxRadius() {
        return Math.min(this.radiusX, this.radiusY) * Math.cos(Math.PI / this.sides)
    }

    private generateRegularPolygon(): Coord[] {
        const points: Coord[] = []
        const sides = this.sides

        for (let i = 0; i < sides; i++) {
            const point = this.getVertex(sides, i)
            points.push(point)
        }

        return points
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const fill = this.paintManager.initFillPaint(this.data.properties.style.fill, this.getDim())
        const stroke = this.paintManager.initStrokePaint(this.data.properties.style.stroke, this.getDim())

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

    protected drawHoverEffect(canvas: Canvas): void {
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
        if (this.points.length === 0) return
        const { x: startX, y: startY } = this.points[0]
        path.moveTo(startX, startY)
        for (let i = 1; i < this.points.length; i++) {
            const { x, y } = this.points[i]
            path.lineTo(x, y)
        }
        path.close()
    }

    private createRoundedPolygonPath(path: Path) {
        const sidesCount = this.sides
        const bRadius = this.bRadius

        for (let i = 0; i < this.points.length; i++) {
            const { startPoint, endPoint, controlPoint, currentRadius } = computeRoundedCorner(
                'polygon',
                i,
                this.points,
                sidesCount,
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

    override convertToPathData(): any {
        const pointsArray: any[] = []
        for (let i = 0; i < this.points.length; i++) {
            const { x, y } = this.points[i]
            // Note: Bypassing parametric border radius rendering for raw points. 
            // Users can use EditTool bezier smoothing manually on the raw nodes.
            pointsArray.push({ x, y, smooth: false })
        }
        return { points: pointsArray, closed: true }
    }

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Polygon
