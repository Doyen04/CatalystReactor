// Handle.ts
import type { Canvas } from 'canvaskit-wasm'
import { HandlePos, HandleType } from '@lib/types/shapes'
import CanvasKitResources from '@lib/core/CanvasKitResource'

export default class Handle {
    x: number
    y: number
    size: number
    type: HandleType
    pos: HandlePos
    stroke: string | number[]
    fill: string | number[]
    isDragging: boolean = false
    handleRatioFromCenter: number | null = null
    handleRatioAngle: number | null = null
    dragDirection?: number
    dragLastDiff?: number
    dragPrevPointer?: number
    dragSweep?: number

    constructor(x: number, y: number, pos: HandlePos, type: HandleType, size = 6) {
        this.x = x
        this.y = y
        this.pos = pos
        this.type = type
        this.stroke = '#00f'
        this.fill = '#fff'

        // By default, use Oval for radius, Rect for size
        if (type !== 'size' && type !== 'angle') {
            this.size = 4
            if (type === 'c-ratio') {
                this.handleRatioAngle = 0
            }
            if (type == 'arc') {
                this.handleRatioFromCenter = 0
            }
        } else {
            this.size = size // Default size for the rect shaped resizers
        }
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }

    updatePosition(x: number, y: number) {
        this.x = x
        this.y = y
    }

    isCollide(px: number, py: number): boolean {
        // Rectangle handle
        const hpad = 2
        if (this.type === 'size') {
            return px >= this.x - hpad && px <= this.x + this.size + hpad && py >= this.y - hpad && py <= this.y + this.size + hpad
        }
        // Oval handle (circle collision)
        const dx = px - this.x
        const dy = py - this.y
        const r = this.size * 2
        return dx * dx + dy * dy <= r * r
    }

    createPaint() {
        if (!this.resource) return
        const cnvsKit = this.resource

        const fill = Array.isArray(this.fill) ? this.fill : cnvsKit.canvasKit.parseColorString(this.fill)
        const strokeColor = Array.isArray(this.stroke) ? this.stroke : cnvsKit.canvasKit.parseColorString(this.stroke)

        cnvsKit.paint.setColor(fill)

        cnvsKit.strokePaint.setColor(strokeColor)
        cnvsKit.strokePaint.setStrokeWidth(1)

        return { fill: this.resource.paint, stroke: this.resource.strokePaint }
    }

    drawRect(canvas: Canvas) {
        const { fill, stroke } = this.createPaint()
        const rect = this.resource.canvasKit.XYWHRect(this.x, this.y, this.size, this.size)
        canvas.drawRect(rect, fill)
        canvas.drawRect(rect, stroke)
    }

    // Draw a small oval at (x, y)
    drawOval(canvas: Canvas) {
        const { fill, stroke } = this.createPaint()
        const ovalRect = this.resource.canvasKit.LTRBRect(this.x, this.y, this.x + this.size * 2, this.y + this.size * 2)
        canvas.drawOval(ovalRect, fill)
        canvas.drawOval(ovalRect, stroke)
    }

    draw(canvas: Canvas) {
        if (this.type !== 'size' && this.type !== 'angle') {
            this.drawOval(canvas)
        } else {
            this.drawRect(canvas)
        }
    }

    reset() {
        this.isDragging = false
        this.handleRatioAngle = 0
        this.handleRatioFromCenter = 0
        this.dragDirection = undefined
        this.dragLastDiff = undefined
        this.dragPrevPointer = undefined
        this.dragSweep = undefined
    }
}
