import Handle from '@lib/modifiers/Handles'
import type { Canvas, Rect } from 'canvaskit-wasm'
import { Coord, Properties, Size } from '@lib/types/shapes'
import Shape from '../base/Shape'

class SimpleRect extends Shape {
    dimension: Size

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: 'rect', ...shapeProps })
        this.dimension = { width: 0, height: 0 }
        this.calculateBoundingRect()
    }

    override moveShape(dx: number, dy: number): void {
        this.transform.x += dx
        this.transform.y += dy

        this.calculateBoundingRect()
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y

        this.calculateBoundingRect()
    }

    //move to shape
    override setDim(width: number, height: number): void {
        this.dimension.width = width
        this.dimension.height = height

        this.calculateBoundingRect()
    }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.dimension = prop.size
        this.style = prop.style
        this.calculateBoundingRect()
    }

    override getCenterCoord(): Coord {
        const { width, height } = this.dimension
        return { x: width / 2, y: height / 2 }
    }

    override getDim(): { width: number; height: number } {
        return {
            width: Math.round(this.dimension.width),
            height: Math.round(this.dimension.height),
        }
    }

    override getProperties(): Properties {
        return {
            transform: { ...this.transform },
            size: { ...this.dimension },
            style: { ...this.style },
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

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: 0,
            left: 0,
            bottom: this.dimension.height,
            right: this.dimension.width,
        }
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const { fill, stroke } = this.initPaints(this.style.fill.color, this.style.stroke.color)

        const rect = this.resource.canvasKit.XYWHRect(0, 0, this.dimension.width, this.dimension.height)

        canvas.drawRect(rect, fill)
        canvas.drawRect(rect, stroke)

        this.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas, rect)
        }
    }

    protected drawHoverEffect(canvas: Canvas, rect: Rect): void {
        if (!this.resource) return

        const hoverPaint = this.paintManager.stroke
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1)) // Blue with transparency
        hoverPaint.setStrokeWidth(2)

        canvas.drawRect(rect, hoverPaint)
    }

    override pointInShape(x: number, y: number): boolean {
        return x >= 0 && x <= this.dimension.width && y >= 0 && y <= this.dimension.height
    }

    override cleanUp(): void {}
    override destroy(): void {}
}

export default SimpleRect
