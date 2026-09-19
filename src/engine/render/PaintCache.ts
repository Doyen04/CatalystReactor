import type { CanvasKit, Image as CanvasKitImage, Paint, Shader } from 'canvaskit-wasm'
import type { ImageFill, PaintStyle, ScaleMode, Size } from '@lib/types/shapes'

export interface PaintRequest {
    readonly color: PaintStyle
    readonly opacity: number
    readonly size: Size
    readonly stroke?: boolean
    readonly strokeWidth?: number
}

interface PaintCacheEntry {
    paint: Paint
    shader: Shader | null
}

function stableStringify(value: unknown): string {
    if (value === null) return 'null'
    const type = typeof value
    if (type === 'string' || type === 'boolean' || type === 'number') return JSON.stringify(value)
    if (type === 'undefined') return 'undefined'
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
    if (type === 'object') {
        const record = value as Record<string, unknown>
        const keys = Object.keys(record).sort()
        return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
    }
    return String(value)
}

export class PaintCache {
    private cache = new Map<string, PaintCacheEntry>()
    private readonly ck: CanvasKit
    private readonly resolveImage: ((fill: ImageFill) => CanvasKitImage | null) | undefined
    private readonly maxSize = 200

    constructor(ck: CanvasKit, resolveImage?: (fill: ImageFill) => CanvasKitImage | null) {
        this.ck = ck
        this.resolveImage = resolveImage
    }

    get(request: PaintRequest): Paint {
        const key = stableStringify(request)
        const hit = this.cache.get(key)
        if (hit) {
            this.cache.delete(key)
            this.cache.set(key, hit)
            return hit.paint
        }

        const entry = this.buildEntry(request)
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) {
                this.evict(firstKey)
            }
        }
        this.cache.set(key, entry)
        return entry.paint
    }

    get size(): number {
        return this.cache.size
    }

    dispose(): void {
        for (const entry of this.cache.values()) {
            this.deleteEntry(entry)
        }
        this.cache.clear()
    }

    private buildEntry(request: PaintRequest): PaintCacheEntry {
        const ck = this.ck
        const paint = new ck.Paint()
        paint.setAntiAlias(true)
        paint.setStyle(request.stroke ? ck.PaintStyle.Stroke : ck.PaintStyle.Fill)
        if (request.stroke && request.strokeWidth !== undefined) {
            paint.setStrokeWidth(request.strokeWidth)
        }

        const shader = this.buildShader(request.color, request.size)
        if (shader) {
            paint.setShader(shader)
        } else {
            paint.setColor(this.buildColor(request.color))
        }

        // setAlphaf must come after setColor, otherwise the color's own alpha wins
        paint.setAlphaf(request.opacity)

        return { paint, shader }
    }

    private buildColor(fill: PaintStyle): Float32Array {
        if (fill.type === 'solid') {
            return Array.isArray(fill.color) ? new Float32Array(fill.color) : this.ck.parseColorString(fill.color)
        }
        return this.ck.parseColorString('#000')
    }

    private buildShader(fill: PaintStyle, size: Size): Shader | null {
        const ck = this.ck
        switch (fill.type) {
            case 'linear': {
                return ck.Shader.MakeLinearGradient(
                    [(fill.x1 / 100) * size.width, (fill.y1 / 100) * size.height],
                    [(fill.x2 / 100) * size.width, (fill.y2 / 100) * size.height],
                    fill.stops.map(stop => ck.parseColorString(stop.color)),
                    fill.stops.map(stop => stop.offset),
                    ck.TileMode.Clamp
                )
            }
            case 'radial': {
                return ck.Shader.MakeRadialGradient(
                    [(fill.cx / 100) * size.width, (fill.cy / 100) * size.height],
                    (fill.radius / 100) * Math.max(size.width, size.height),
                    fill.stops.map(stop => ck.parseColorString(stop.color)),
                    fill.stops.map(stop => stop.offset),
                    ck.TileMode.Clamp
                )
            }
            case 'image': {
                if (!this.resolveImage) return null
                const image = this.resolveImage(fill)
                if (!image) return null
                const matrix = this.calculateImageMatrix(size, image, fill.scaleMode)
                return image.makeShaderOptions(ck.TileMode.Clamp, ck.TileMode.Clamp, ck.FilterMode.Linear, ck.MipmapMode.Linear, matrix)
            }
            case 'pattern':
                return null
            default:
                return null
        }
    }

    private calculateImageMatrix(dim: Size, image: CanvasKitImage, scaleMode: ScaleMode): number[] {
        const ck = this.ck
        const imageWidth = image.width()
        const imageHeight = image.height()

        let scale: number
        let offsetX = 0
        let offsetY = 0

        switch (scaleMode) {
            case 'fill':
                scale = Math.max(dim.width / imageWidth, dim.height / imageHeight)
                offsetX = (dim.width - imageWidth * scale) / 2
                offsetY = (dim.height - imageHeight * scale) / 2
                break
            case 'fit':
                scale = Math.min(dim.width / imageWidth, dim.height / imageHeight)
                offsetX = (dim.width - imageWidth * scale) / 2
                offsetY = (dim.height - imageHeight * scale) / 2
                break
            case 'tile':
                scale = 1
                break
            case 'stretch':
                return ck.Matrix.scaled(dim.width / imageWidth, dim.height / imageHeight)
            default:
                scale = Math.max(dim.width / imageWidth, dim.height / imageHeight)
        }

        return ck.Matrix.multiply(ck.Matrix.translated(offsetX, offsetY), ck.Matrix.scaled(scale, scale))
    }

    private evict(key: string): void {
        const entry = this.cache.get(key)
        if (!entry) return
        this.cache.delete(key)
        this.deleteEntry(entry)
    }

    private deleteEntry(entry: PaintCacheEntry): void {
        try {
            entry.shader?.delete()
        } catch (error) {
            console.warn('PaintCache: failed to delete a shader', error)
        }
        try {
            entry.paint.delete()
        } catch (error) {
            console.warn('PaintCache: failed to delete a paint', error)
        }
    }
}
