import type { Paint } from "canvaskit-wasm"
import CanvasKitResources from "./CanvasKitResource"

class PaintManager {
    private fillPaint: Paint
    private strokePaint: Paint
    private cache: Map<string, unknown>

    constructor() {
        this.cache = new Map()
        this.setUpPaint()
    }

    get resource(): CanvasKitResources | null {
        const r = CanvasKitResources.getInstance()
        if (!r) console.warn('CanvasKit resource is null')
        return r
    }

    get(key: string): unknown {
        if (!this.cache.has(key)) return undefined
        const value = this.cache.get(key)!
        this.cache.delete(key)
        this.cache.set(key, value)
        return value
    }

    set(key: string, value: unknown): void {
        if (this.cache.has(key)) this.cache.delete(key)
        this.cache.set(key, value)
    }

    has(key: string): boolean {
        return this.cache.has(key)
    }

    delete(key: string): void {
        this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
    }

    private setUpPaint(): void {
        const res = this.resource
        if (!res) return

        this.fillPaint = new res.canvasKit.Paint()
        this.fillPaint.setColor(res.canvasKit.Color(60, 0, 0, 0.3))
        this.fillPaint.setStyle(res.canvasKit.PaintStyle.Fill)
        this.fillPaint.setAntiAlias(true)

        this.strokePaint = new res.canvasKit.Paint()
        this.strokePaint.setColor(res.canvasKit.Color(0, 255, 0, 1))
        this.strokePaint.setStyle(res.canvasKit.PaintStyle.Stroke)
        this.strokePaint.setStrokeWidth(2)
        this.strokePaint.setAntiAlias(true)
    }

    get paint() {
        return this.fillPaint
    }
    get stroke() {
        return this.strokePaint
    }

    public destroy() {
        this.fillPaint.delete()
        this.strokePaint.delete()

        this.fillPaint = null
        this.strokePaint = null
    }
}

export default PaintManager