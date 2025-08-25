import Handle from '@/lib/modifiers/Handles'
import Shape from '../base/Shape'
import type { Canvas, Path, Rect } from 'canvaskit-wasm'
import { ArcSegment, Coord, Properties } from '@lib/types/shapes'

class Oval extends Shape {
    private radiusX: number
    private radiusY: number

    private isFlippedX: boolean
    private isFlippedY: boolean
    private centerX: number
    private centerY: number
    private arcSegment: ArcSegment

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'oval', ...shapeProps })
        this.arcSegment = { startAngle: 0, endAngle: 2 * Math.PI, ratio: 0 }
        this.radiusX = 0
        this.radiusY = 0
        this.transform.isFlippedX = false
        this.transform.isFlippedY = false
        this.centerX = 0
        this.centerY = 0
        this.calculateBoundingRect()
    }

    override moveShape(mx: number, my: number): void {
        this.transform.x += mx
        this.transform.y += my
        this.centerX += mx
        this.centerY += my
        this.calculateBoundingRect()
    }

    setRadius(radius: number): void {
        this.radiusX = radius
        this.radiusY = radius

        this.centerX = this.transform.x + radius
        this.centerY = this.transform.y + radius

        this.calculateBoundingRect()
    }

    //move to shape
    override setDim(width: number, height: number) {
        this.radiusX = width / 2
        this.radiusY = height / 2

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.calculateBoundingRect()
    }

    setRatio(nx: number) {
        this.arcSegment.ratio = nx
    }

    override setCoord(centerX: number, centerY: number): void {
        this.transform.x = centerX
        this.transform.y = centerY

        this.centerX = this.transform.x + this.radiusX
        this.centerY = this.transform.y + this.radiusY

        this.calculateBoundingRect()
    }

    setArc(startAngle: number, endAngle: number) {
        this.arcSegment.startAngle = startAngle
        this.arcSegment.endAngle = endAngle
    }

    override setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        this.isFlippedX = deltaX < 0
        this.isFlippedY = deltaY < 0

        if (shiftKey) {
            // Circle mode - use the larger distance for perfect circle
            const radius = Math.max(Math.abs(deltaX), Math.abs(deltaY))
            this.radiusX = radius / 2
            this.radiusY = radius / 2

            this.centerX = dragStart.x + (deltaX >= 0 ? this.radiusX : -this.radiusX)
            this.centerY = dragStart.y + (deltaY >= 0 ? this.radiusY : -this.radiusY)

            this.transform.x = deltaX >= 0 ? dragStart.x : dragStart.x - radius
            this.transform.y = deltaY >= 0 ? dragStart.y : dragStart.y - radius
        } else {
            // Oval mode
            this.radiusX = Math.abs(deltaX) / 2
            this.radiusY = Math.abs(deltaY) / 2

            this.centerX = (dragStart.x + mx) / 2
            this.centerY = (dragStart.y + my) / 2

            this.transform.x = deltaX < 0 ? mx : dragStart.x
            this.transform.y = deltaY < 0 ? my : dragStart.y
        }

        this.calculateBoundingRect()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.setDim(prop.size.width, prop.size.height)
        this.style = prop.style
        this.arcSegment = prop.arcSegment
    }

    handleFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        if (this.transform.isFlippedX === isFlippedX && this.transform.isFlippedY === isFlippedY) return
        this.transform.isFlippedX = isFlippedX
        this.transform.isFlippedY = isFlippedY
    }

    override getDim(): { width: number; height: number } {
        return { width: this.radiusX * 2, height: this.radiusY * 2 }
    }

    override getProperties(): Properties {
        return {
            transform: this.transform,
            size: this.getDim(),
            style: this.style,
            arcSegment: this.arcSegment,
        }
    }

    getArcAngles(): { start: number; end: number } {
        return {
            start: this.arcSegment.startAngle,
            end: this.arcSegment.endAngle,
        }
    }

    getCenterCoord(): { x: number; y: number } {
        return { x: this.centerX, y: this.centerY }
    }

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
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
        } else {
            return { x: 0, y: 0 }
        }
    }

    private getRatioModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        // const { width, height } = this.getDim()

        if (this.arcSegment.ratio === 0) {
            return {
                x: this.radiusX - size,
                y: this.radiusY - size,
            }
        }

        const innerRadiusX = this.radiusX * this.arcSegment.ratio
        const innerRadiusY = this.radiusY * this.arcSegment.ratio

        const handleAngle = handle.isDragging ? handle.handleRatioAngle : (this.arcSegment.startAngle + this.arcSegment.endAngle) / 2

        const handleX = innerRadiusX * Math.cos(handleAngle)
        const handleY = innerRadiusY * Math.sin(handleAngle)

        return {
            x: handleX - size,
            y: handleY - size,
        }
    }

    private getArcModifierHandlesPos(handle: Handle): Coord {
        const size = handle.size
        const gap = 20

        const outerRx = this.radiusX
        const outerRy = this.radiusY
        const innerRx = this.radiusX * this.arcSegment.ratio
        const innerRy = this.radiusY * this.arcSegment.ratio

        const rx = this.arcSegment.ratio === 0 ? outerRx - gap : (outerRx + innerRx) / 2
        const ry = this.arcSegment.ratio === 0 ? outerRy - gap : (outerRy + innerRy) / 2

        const theta = handle.pos === 'arc-end' ? this.arcSegment.endAngle : this.arcSegment.startAngle

        // Compute handle's center point along ellipse, then offset by handle size
        const handleCenterX = this.centerX + rx * Math.cos(theta)
        const handleCenterY = this.centerY + ry * Math.sin(theta)

        return {
            x: handleCenterX - size,
            y: handleCenterY - size,
        }
    }

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: this.transform.y,
            left: this.transform.x,
            bottom: this.transform.y + this.radiusY * 2,
            right: this.transform.x + this.radiusX * 2,
        }
    }

    isArc(): boolean {
        return Math.abs(this.arcSegment.endAngle - this.arcSegment.startAngle) < 2 * Math.PI
    }

    isTorus(): boolean {
        return this.arcSegment.ratio > 0
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const { fill, stroke } = this.initPaints()
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

        this.resetPaint()
    }

    private drawComplexShape(canvas: Canvas, rect: Rect) {
        const { canvasKit } = this.resource
        const path = new canvasKit.Path()

        const innerRect = canvasKit.LTRBRect(
            this.centerX - this.radiusX * this.arcSegment.ratio,
            this.centerY - this.radiusY * this.arcSegment.ratio,
            this.centerX + this.radiusX * this.arcSegment.ratio,
            this.centerY + this.radiusY * this.arcSegment.ratio
        )
        const startDegrees = (this.arcSegment.startAngle * 180) / Math.PI
        const sweepDegrees = ((this.arcSegment.endAngle - this.arcSegment.startAngle) * 180) / Math.PI

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
        path.moveTo(this.centerX, this.centerY)
        path.arcToOval(rect, startDegrees, sweepDegrees, false)
        path.close()
    }

    private drawTorus(rect: Rect, innerRect: Rect, path: Path) {
        path.addOval(rect)
        path.addOval(innerRect, true) // true = clockwise (creates hole)
    }

    private drawComplexTorusArc(rect: Rect, innerRect: Rect, path: Path, startDegrees: number, sweepDegrees: number) {
        const innerStartX = this.centerX + this.radiusX * this.arcSegment.ratio * Math.cos(this.arcSegment.startAngle)
        const innerStartY = this.centerY + this.radiusY * this.arcSegment.ratio * Math.sin(this.arcSegment.startAngle)

        const outerEndX = this.centerX + this.radiusX * Math.cos(this.arcSegment.endAngle)
        const outerEndY = this.centerY + this.radiusY * Math.sin(this.arcSegment.endAngle)

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

        const dx = x - this.centerX
        const dy = y - this.centerY

        // (x-cx)²/rx² + (y-cy)²/ry² <= 1
        const normalizedDistance = (dx * dx) / (this.radiusX * this.radiusX) + (dy * dy) / (this.radiusY * this.radiusY)

        return normalizedDistance <= 1
    }

    rotate(r: number) {
        this.transform.rotation = r
    }
    override cleanUp(): void {}
    override destroy(): void {}
}

export default Oval
