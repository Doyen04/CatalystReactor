import Handle from '@/lib/modifiers/Handles'
import Shape from '../base/Shape'
import type { Canvas, Path, Rect } from 'canvaskit-wasm'
import { ArcHandleState, ArcSegment, Coord, Properties } from '@lib/types/shapes'
import clamp from '@lib/helper/clamp'
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

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })
        handles.push(new Handle(0, 0, 'arc-end', 'arc'))
        handles.push(new Handle(0, 0, 'arc-start', 'arc'))
        handles.push(new Handle(0, 0, 'center', 'c-ratio'))
        return handles
    }

    override getModifierHandlesPos(handle: Handle): Coord {
        if (handle.type == 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'c-ratio') {
            return this.getRatioModifierHandlesPos(handle)
        } else if (handle.type == 'arc') {
            return this.getArcModifierHandlesPos(handle)
        } else if (handle.type == 'angle') {
            return super.getAngleModifierHandlesPos(handle)
        } else {
            return { x: 0, y: 0 }
        }
    }

    private getRatioModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        const arc = this.arcSegment

        if (arc.ratio === 0) {
            return {
                x: this.radiusX - size,
                y: this.radiusY - size,
            }
        }

        const innerRadiusX = this.radiusX * arc.ratio
        const innerRadiusY = this.radiusY * arc.ratio

        const handleAngle = handle.isDragging ? handle.handleRatioAngle : arc.startAngle + this.getSweep() / 2

        const handleX = this.radiusX + innerRadiusX * Math.cos(handleAngle)
        const handleY = this.radiusY + innerRadiusY * Math.sin(handleAngle)

        return {
            x: handleX - size,
            y: handleY - size,
        }
    }

    private getArcModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        const arc = this.arcSegment

        const outerRx = this.radiusX
        const outerRy = this.radiusY
        const innerRx = this.radiusX * arc.ratio
        const innerRy = this.radiusY * arc.ratio

        let rx = 0
        let ry = 0
        if (handle.isDragging) {
            const ratio = clamp(handle.handleRatioFromCenter, arc.ratio, 1)
            rx = outerRx * ratio
            ry = outerRy * ratio
        } else {
            rx = arc.ratio === 0 ? outerRx * 0.8 : (outerRx + innerRx) / 2
            ry = arc.ratio === 0 ? outerRy * 0.8 : (outerRy + innerRy) / 2
        }

        const theta = handle.pos === 'arc-end' ? arc.startAngle + arc.sweep : arc.startAngle

        // Compute handle's center point along ellipse, then offset by handle size
        const handleCenterX = this.radiusX + rx * Math.cos(theta)
        const handleCenterY = this.radiusY + ry * Math.sin(theta)

        return {
            x: handleCenterX - size,
            y: handleCenterY - size,
        }
    }

    override getSweep() {
        const TWO_PI = 2 * Math.PI
        const arc = this.arcSegment
        const sweep = (this.arcHandleState.dragDirection * -1) >= 0 ? normalizeAngle(arc.sweep) : normalizeAngle(arc.sweep) - TWO_PI

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

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Oval
