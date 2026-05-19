import Handle from '@lib/modifiers/Handles'
import type { Canvas, Rect } from 'canvaskit-wasm'
import { Coord, Properties, Size } from '@lib/types/shapes'
import Shape from '../base/Shape'
import { ShapeData } from '@lib/core/EngineStateStore'

class SimpleRect extends Shape {
    constructor(data: ShapeData) {
        super(data)
    }

    override setDim(width: number, height: number): void {
        this.data.properties.size.width = width
        this.data.properties.size.height = height
    }

    override getCenterCoord(): Coord {
        const { width, height } = this.data.properties.size
        return { x: width / 2, y: height / 2 }
    }

    override getDim(): { width: number; height: number } {
        return {
            width: Math.round(this.data.properties.size.width),
            height: Math.round(this.data.properties.size.height),
        }
    }

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()

        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })

        return handles
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'angle') {
            return super.getAngleModifierHandlesPos(handle)
        }
        return { x: 0, y: 0 }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const fill = this.paintManager.initFillPaint(this.data.properties.style.fill, this.getDim())
        const stroke = this.paintManager.initStrokePaint(this.data.properties.style.stroke, this.getDim())

        const rect = this.resource.canvasKit.XYWHRect(0, 0, this.data.properties.size.width, this.data.properties.size.height)

        canvas.drawRect(rect, fill)
        canvas.drawRect(rect, stroke)

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

        canvas.drawRect(rect, hoverPaint)
    }

    override pointInShape(x: number, y: number): boolean {
        const { width, height } = this.data.properties.size
        return x >= 0 && x <= width && y >= 0 && y <= height
    }

    override cleanUp(): void { }
    override destroy(): void { }
}

export default SimpleRect
