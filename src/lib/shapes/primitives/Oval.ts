import Shape from '../base/Shape'
import type { Canvas, Path, Rect } from 'canvaskit-wasm'
import { ArcHandleState, ArcSegment, Coord } from '@lib/types/shapes'
import { normalizeAngle } from '@lib/helper/normalise'
import { ShapeData } from '@lib/core/EngineStateStore'

class Oval extends Shape {
    private arcHandleState: ArcHandleState

    constructor(data: ShapeData) {
        super(data)
        const arcSegment = this.data.properties.arcSegment || { startAngle: 0, sweep: 2 * Math.PI, ratio: 0 }
        this.arcHandleState = {
            dragDirection: arcSegment.sweep >= 0 ? 1 : -1,
            dragLastDiff: normalizeAngle(arcSegment.sweep),
            dragPrevPointer: normalizeAngle(arcSegment.startAngle + arcSegment.sweep),
        }
    }

    get radiusX(): number {
        return this.data.properties.size.width / 2
    }

    get radiusY(): number {
        return this.data.properties.size.height / 2
    }

    get arcSegment(): ArcSegment {
        return this.data.properties.arcSegment || { startAngle: 0, sweep: 2 * Math.PI, ratio: 0 }
    }

    override setDim(width: number, height: number) {
        this.data.properties.size.width = width
        this.data.properties.size.height = height
    }

    override setRatio(nx: number) {
        if (!this.data.properties.arcSegment) {
            this.data.properties.arcSegment = { startAngle: 0, sweep: 2 * Math.PI, ratio: nx }
        } else {
            this.data.properties.arcSegment.ratio = nx
        }
    }

    override setArc(startAngle: number, sweep: number) {
        if (!this.data.properties.arcSegment) {
            this.data.properties.arcSegment = { startAngle, sweep, ratio: 0 }
        } else {
            this.data.properties.arcSegment.startAngle = startAngle
            this.data.properties.arcSegment.sweep = sweep
        }
    }

    override getDim(): { width: number; height: number } {
        return { 
            width: Math.round(this.data.properties.size.width), 
            height: Math.round(this.data.properties.size.height) 
        }
    }

    override getArcAngles(): { start: number; sweep: number } {
        const arc = this.arcSegment
        return {
            start: arc.startAngle,
            sweep: arc.sweep,
        }
    }

    override getCenterCoord(): { x: number; y: number } {
        return { x: this.radiusX, y: this.radiusY }
    }

    override drawModifierHandles(canvas: Canvas, resource: any): void {
        super.drawModifierHandles(canvas, resource) // draw size and rotation
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

        // Draw C-Ratio Arc Handle
        const arc = this.arcSegment
        const innerRadiusX = this.radiusX * arc.ratio
        const innerRadiusY = this.radiusY * arc.ratio
        
        if (arc.ratio === 0) {
            drawCircle(this.radiusX, this.radiusY)
        } else {
            const handleAngle = arc.startAngle + this.getSweep() / 2
            const ratioX = this.radiusX + innerRadiusX * Math.cos(handleAngle)
            const ratioY = this.radiusY + innerRadiusY * Math.sin(handleAngle)
            drawCircle(ratioX, ratioY)
        }

        // Draw Arc Start and Arc End Handles
        const getArcCenter = (theta: number, rRatio: number) => {
            const rx = arc.ratio === 0 ? this.radiusX * 0.8 : (this.radiusX + innerRadiusX) / 2
            const ry = arc.ratio === 0 ? this.radiusY * 0.8 : (this.radiusY + innerRadiusY) / 2
            return {
                x: this.radiusX + rx * Math.cos(theta),
                y: this.radiusY + ry * Math.sin(theta)
            }
        }
        
        const arcStartCenter = getArcCenter(arc.startAngle, arc.ratio)
        const arcEndCenter = getArcCenter(arc.startAngle + arc.sweep, arc.ratio)

        drawCircle(arcStartCenter.x, arcStartCenter.y)
        drawCircle(arcEndCenter.x, arcEndCenter.y)

        paint.delete(); stroke.delete()
    }

    override hitTestModifierHandle(x: number, y: number): string | null {
        const base = super.hitTestModifierHandle(x, y)
        if (base) return base

        const arc = this.arcSegment
        const innerRadiusX = this.radiusX * arc.ratio
        const innerRadiusY = this.radiusY * arc.ratio

        const s = 10 // pad
        
        const handleAngle = arc.startAngle + this.getSweep() / 2
        const ratioX = arc.ratio === 0 ? this.radiusX : this.radiusX + innerRadiusX * Math.cos(handleAngle)
        const ratioY = arc.ratio === 0 ? this.radiusY : this.radiusY + innerRadiusY * Math.sin(handleAngle)
        
        if (Math.abs(x - ratioX) <= s && Math.abs(y - ratioY) <= s) return 'c-ratio'

        const getArcCenter = (theta: number) => {
            const rx = arc.ratio === 0 ? this.radiusX * 0.8 : (this.radiusX + innerRadiusX) / 2
            const ry = arc.ratio === 0 ? this.radiusY * 0.8 : (this.radiusY + innerRadiusY) / 2
            return {
                x: this.radiusX + rx * Math.cos(theta),
                y: this.radiusY + ry * Math.sin(theta)
            }
        }

        const aStart = getArcCenter(arc.startAngle)
        const aEnd = getArcCenter(arc.startAngle + arc.sweep)
        
        if (Math.abs(x - aStart.x) <= s && Math.abs(y - aStart.y) <= s) return 'arc-start'
        if (Math.abs(x - aEnd.x) <= s && Math.abs(y - aEnd.y) <= s) return 'arc-end'

        return null
    }

    override dragModifierHandle(handleID: string, localCurrent: Coord, localStart: Coord, initialShapeData: any): void {
        const { width, height } = this.data.properties.size
        const radiusX = width / 2
        const radiusY = height / 2
        
        if (handleID === 'c-ratio') {
            const ratio = this.calculateRatioFromMousePosition(localCurrent, radiusX, radiusY, width, height)
            this.setRatio(ratio)
        } else if (handleID === 'arc-start' || handleID === 'arc-end') {
            const { start, sweep } = initialShapeData.arcAngle
            const deltaX = localCurrent.x - radiusX
            const deltaY = localCurrent.y - radiusY
            const pointerAngle = normalizeAngle(Math.atan2(radiusX * deltaY, radiusY * deltaX))
            
            if (handleID === 'arc-start') {
                const newStart = normalizeAngle(pointerAngle)
                const currentState = this.ensureArcEndState(this.arcHandleState, sweep, newStart)
                this.setArcHandleState(currentState, true)
                this.setArc(newStart, sweep)
            } else {
                const currentState = this.ensureArcEndState(this.arcHandleState, sweep, start)
                const { state: nextState, sweep: newSweep } = this.resolveArcEndSweep(currentState, pointerAngle, start)
                this.setArcHandleState(nextState, true)
                this.setArc(start, newSweep)
            }
        }
    }

    private calculateRatioFromMousePosition(e: Coord, centerX: number, centerY: number, width: number, height: number): number {
        const deltaX = e.x - centerX
        const deltaY = e.y - centerY
        const radiusX = width / 2
        const radiusY = height / 2
        const deg = Math.atan2(deltaY, deltaX)
        const cos = Math.cos(deg)
        const sin = Math.sin(deg)
        const ellipseRadiusAtAngle = Math.sqrt((radiusX * radiusX * radiusY * radiusY) / (radiusY * radiusY * cos * cos + radiusX * radiusX * sin * sin))
        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        return Math.min(0.99, distanceFromCenter / ellipseRadiusAtAngle)
    }

    private ensureArcEndState(state: any, sweep: number, anchorAngle: number): ArcHandleState {
        if (state?.dragDirection !== undefined) return state
        return {
            ...(state ?? {}),
            dragDirection: sweep >= 0 ? 1 : -1,
            dragLastDiff: normalizeAngle(sweep),
            dragPrevPointer: normalizeAngle(anchorAngle + sweep),
        }
    }

    private resolveArcEndSweep(state: ArcHandleState, pointerAngle: number, anchorAngle: number): { state: ArcHandleState; sweep: number } {
        const diffCW = normalizeAngle(pointerAngle - anchorAngle)
        const TWO_PI = 2 * Math.PI
        const FULL_ARC_EPSILON = 1e-4
        const SWEEP_LIMIT = TWO_PI - FULL_ARC_EPSILON
        const prevDiff = state.dragLastDiff ?? diffCW
        const prevPointer = state.dragPrevPointer ?? pointerAngle

        let pointerDelta = pointerAngle - prevPointer
        if (pointerDelta > Math.PI) pointerDelta -= TWO_PI
        if (pointerDelta < -Math.PI) pointerDelta += TWO_PI

        let dragDirection = state.dragDirection ?? 1
        const EPS = 1e-6
        if (pointerDelta > EPS && diffCW + EPS < prevDiff) dragDirection *= -1
        else if (pointerDelta < -EPS && diffCW > prevDiff + EPS) dragDirection *= -1

        const sweepCandidate = (dragDirection >= 0) ? diffCW : diffCW - TWO_PI
        const sweep = Math.max(-SWEEP_LIMIT, Math.min(SWEEP_LIMIT, sweepCandidate))

        return { 
            state: { ...state, dragDirection, dragLastDiff: diffCW, dragPrevPointer: pointerAngle },
            sweep 
        }
    }

    override getSweep() {
        const TWO_PI = 2 * Math.PI
        const arc = this.arcSegment
        const sweep = this.arcHandleState.dragDirection >= 0 ? normalizeAngle(arc.sweep) : normalizeAngle(arc.sweep) - TWO_PI
        return sweep
    }

    override getArcHandleState(): ArcHandleState | null {
        return this.arcHandleState
    }

    override setArcHandleState(state: Partial<ArcHandleState>, replace = false): void {
        this.arcHandleState = replace ? { ...state } : { ...this.arcHandleState, ...state }
    }

    override toDegree(rad: number) {
        return rad * (180 / Math.PI)
    }

    override isArc(): boolean {
        return Math.abs(this.arcSegment.sweep) < 2 * Math.PI
    }

    isTorus(): boolean {
        return this.arcSegment.ratio > 0
    }

    override getPath(): Path | null {
        if (!this.resource) return null
        const { width, height } = this.getDim()
        const rect = this.resource.canvasKit.XYWHRect(0, 0, width, height)

        if (this.isTorus() || this.isArc()) {
            return this.drawComplexShape(null as any, rect)
        } else {
            const path = new this.resource.canvasKit.Path()
            path.addOval(rect)
            return path
        }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const fill = this.paintManager.initFillPaint(this.data.properties.style.fill, this.getDim())
        const stroke = this.paintManager.initStrokePaint(this.data.properties.style.stroke, this.getDim())
        const { width, height } = this.getDim()

        const rect = this.resource.canvasKit.XYWHRect(0, 0, width, height)

        if (this.isTorus() || this.isArc()) {
            // Draw torus using path
            const path = this.drawComplexShape(canvas, rect)
            canvas.drawPath(path, fill)
            canvas.drawPath(path, stroke)
            path.delete()
        } else {
            canvas.drawOval(rect, fill)
            canvas.drawOval(rect, stroke)
        }

        this.paintManager.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas, rect)
        }
    }

    protected override drawHoverEffect(canvas: Canvas, rect: any): void {
        if (!this.resource) return

        const hoverPaint = this.paintManager.stroke
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1)) // Blue with transparency
        hoverPaint.setStrokeWidth(2)

        if (this.isTorus() || this.isArc()) {
            const path = this.drawComplexShape(canvas, rect)
            canvas.drawPath(path, hoverPaint)
            path.delete()
        } else {
            canvas.drawOval(rect, hoverPaint)
        }
    }

    private drawComplexShape(canvas: Canvas, rect: Rect) {
        const { canvasKit } = this.resource
        const path = new canvasKit.Path()
        const arc = this.arcSegment

        const innerRect = canvasKit.XYWHRect(
            this.radiusX - this.radiusX * arc.ratio,
            this.radiusY - this.radiusY * arc.ratio,
            this.radiusX * arc.ratio * 2,
            this.radiusY * arc.ratio * 2
        )
        const startDegrees = this.toDegree(arc.startAngle)
        const sweep = this.getSweep()

        const sweepDegrees = this.toDegree(sweep)

        if (this.isTorus() && !this.isArc()) {
            this.drawTorus(rect, innerRect, path)
        } else if (this.isArc() && !this.isTorus()) {
            this.drawArc(rect, path, startDegrees, sweepDegrees)
        } else {
            this.drawComplexTorusArc(rect, innerRect, path, startDegrees, sweepDegrees)
        }
        path.setFillType(canvasKit.FillType.EvenOdd)

        return path
    }

    private drawArc(rect: Rect, path: Path, startDegrees: number, sweepDegrees: number) {
        path.moveTo(this.radiusX, this.radiusY)
        path.arcToOval(rect, startDegrees, sweepDegrees, false)
        path.close()
    }

    private drawTorus(rect: Rect, innerRect: Rect, path: Path) {
        path.addOval(rect)
        path.addOval(innerRect, true) // true = clockwise (creates hole)
    }

    private drawComplexTorusArc(rect: Rect, innerRect: Rect, path: Path, startDegrees: number, sweepDegrees: number) {
        const arc = this.arcSegment
        const innerStartX = this.radiusX + this.radiusX * arc.ratio * Math.cos(arc.startAngle)
        const innerStartY = this.radiusY + this.radiusY * arc.ratio * Math.sin(arc.startAngle)

        const outerEndX = this.radiusX + this.radiusX * Math.cos(arc.startAngle + arc.sweep)
        const outerEndY = this.radiusY + this.radiusY * Math.sin(arc.startAngle + arc.sweep)

        path.moveTo(innerStartX, innerStartY)
        path.arcToOval(innerRect, startDegrees, sweepDegrees, false)

        path.lineTo(outerEndX, outerEndY)
        path.arcToOval(rect, startDegrees + sweepDegrees, -sweepDegrees, false)

        path.close()
    }

    override pointInShape(x: number, y: number): boolean {
        if (this.radiusX <= 0 || this.radiusY <= 0) {
            return false
        }
        const dx = x - this.radiusX
        const dy = y - this.radiusY

        // (x-cx)²/rx² + (y-cy)²/ry² <= 1
        const normalizedDistance = (dx * dx) / (this.radiusX * this.radiusX) + (dy * dy) / (this.radiusY * this.radiusY)

        return normalizedDistance <= 1
    }

    override convertToPathData(): any {
        const { width, height } = this.data.properties.size
        const rx = width / 2
        const ry = height / 2
        const cx = rx
        const cy = ry
        
        // Exact cubic Bézier constant for a circle/ellipse
        const k = 0.552284749831
        const dx = rx * k
        const dy = ry * k

        const points: any[] = [
            { x: cx, y: 0, cp1: { x: cx - dx, y: 0 }, cp2: { x: cx + dx, y: 0 }, smooth: true }, // Top
            { x: width, y: cy, cp1: { x: width, y: cy - dy }, cp2: { x: width, y: cy + dy }, smooth: true }, // Right
            { x: cx, y: height, cp1: { x: cx + dx, y: height }, cp2: { x: cx - dx, y: height }, smooth: true }, // Bottom
            { x: 0, y: cy, cp1: { x: 0, y: cy + dy }, cp2: { x: 0, y: cy - dy }, smooth: true } // Left
        ]

        return { points, closed: true }
    }

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Oval
