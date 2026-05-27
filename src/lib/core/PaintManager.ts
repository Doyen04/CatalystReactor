import type { Color, Shader, Image as CanvasKitImage, Paint } from "canvaskit-wasm"
import CanvasKitResources from "./CanvasKitResource"
import { SolidFill, LinearGradient, RadialGradient, ImageFill, Size, ScaleMode, PaintStyle, ColorProps, Stroke } from "@lib/types/shapes"
import { PCache } from "./Cache"

class PaintManager {
    private fillPaint: Paint | null = null
    private strokePaint: Paint | null = null
    private paintCache: PCache<Paint>
    imageCache: PCache<CanvasKitImage>
    private transientShaders: Shader[] = []

    constructor() {
        this.paintCache = new PCache<Paint>()
        this.imageCache = new PCache<CanvasKitImage>()
        this.setUpPaint()
    }

    get resource(): CanvasKitResources | null {
        const r = CanvasKitResources.getInstance()
        if (!r) console.warn('CanvasKit resource is null')
        return r
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

    private registerTransientShader(shader: Shader): Shader {
        this.transientShaders.push(shader)
        return shader
    }

    setPaint(fill: PaintStyle, size: Size): Color | Shader | null {
        if (!this.resource) return null
        const ck = this.resource.canvasKit

        switch (fill.type) {
            case 'solid': {
                const solid = fill as SolidFill
                return Array.isArray(solid.color) 
                    ? new Float32Array(solid.color) 
                    : ck.parseColorString(solid.color)
            }
            case 'linear': {
                const grad = fill as LinearGradient

                // Compute final pixel coordinates directly
                const x1 = (grad.x1 / 100) * size.width
                const y1 = (grad.y1 / 100) * size.height
                const x2 = (grad.x2 / 100) * size.width
                const y2 = (grad.y2 / 100) * size.height

                const shader = ck.Shader.MakeLinearGradient(
                    [x1, y1], [x2, y2],
                    grad.stops.map(s => ck.parseColorString(s.color)),
                    grad.stops.map(s => s.offset),
                    ck.TileMode.Clamp
                )
                if (!shader) return null
                return this.registerTransientShader(shader)
            }
            case 'radial': {
                const grad = fill as RadialGradient

                const cx = (grad.cx / 100) * size.width
                const cy = (grad.cy / 100) * size.height
                const radius = (grad.radius / 100) * Math.max(size.width, size.height)

                const shader = ck.Shader.MakeRadialGradient(
                    [cx, cy], radius,
                    grad.stops.map(s => ck.parseColorString(s.color)),
                    grad.stops.map(s => s.offset),
                    ck.TileMode.Clamp
                )
                if (!shader) return null
                return this.registerTransientShader(shader)
            }
            case 'image': {
                const { imageData, scaleMode } = fill as ImageFill
                let cnvsImage = this.imageCache.get(imageData.name)

                if (!cnvsImage && imageData.imageBuffer) {
                    cnvsImage = this.createCanvasKitImage(imageData.imageBuffer)
                    this.imageCache.set(imageData.name, cnvsImage)
                }
                if (!cnvsImage) return null

                const matrix = this.calculateImageMatrix(size, cnvsImage, scaleMode)

                const shader = cnvsImage.makeShaderOptions(
                    ck.TileMode.Clamp, ck.TileMode.Clamp,
                    ck.FilterMode.Linear, ck.MipmapMode.Linear,
                    matrix
                )
                if (!shader) return null
                return this.registerTransientShader(shader)
            }
            case 'pattern': return null
            default: return ck.parseColorString('#000')
        }
    }

    initFillPaint(fill: ColorProps, size: Size): Paint {
        const fillShader = this.setPaint(fill.color, size)

        if (this.isColor(fillShader)) {
            this.paint.setColor(fillShader as Color)
        } else if (this.isShader(fillShader)) {
            this.paint.setShader(fillShader as Shader)
        }
        this.paint.setAlphaf(fill.opacity)

        return this.paint
    }

    initStrokePaint(stroke: Stroke, size: Size): Paint {
        const strokeShader = this.setPaint(stroke.color, size)
        if (this.isColor(strokeShader)) {
            this.stroke.setColor(strokeShader as Color)
        } else if (this.isShader(strokeShader)) {
            this.stroke.setShader(strokeShader as Shader)
        }
        this.stroke.setAlphaf(stroke.opacity)

        this.stroke.setStrokeWidth(stroke.width)
        return this.stroke
    }

    makeNewPaint(props: ColorProps | Stroke, size: Size, isStroke = false): Paint | null {
        const res = this.resource
        if (!res || !props) return null

        const paint = new res.canvasKit.Paint()
        if (isStroke) {
            paint.setStyle(res.canvasKit.PaintStyle.Stroke)
        }

        const src = this.setPaint(props.color, size)
        if (this.isColor(src)) {
            paint.setColor(src as Color)
        } else if (this.isShader(src)) {
            paint.setShader(src as Shader)
        }

        paint.setAlphaf(props.opacity)
        if (isStroke) {
            paint.setStrokeWidth((props as Stroke).width)
        }
        return paint
    }

    resetPaint() {
        this.paint.setShader(null)
        this.stroke.setShader(null)

        this.paint.setAlphaf(1.0)
        this.stroke.setAlphaf(1.0)

        // Clean up transient shaders to prevent WASM memory leaks
        for (const shader of this.transientShaders) {
            shader.delete()
        }
        this.transientShaders = []
    }

    calculateImageMatrix(dim: Size, canvasKitImage: CanvasKitImage, scaleMode: ScaleMode = 'fill'): number[] {
        if (!this.resource?.canvasKit) return [1, 0, 0, 0, 1, 0, 0, 0, 1]
        const ck = this.resource.canvasKit

        const imageWidth = canvasKitImage.width()
        const imageHeight = canvasKitImage.height()

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

    createCanvasKitImage(backgroundImage: ArrayBuffer): CanvasKitImage | null {
        if (!backgroundImage || !this.resource?.canvasKit) return null

        const cnvsimg = this.resource.canvasKit.MakeImageFromEncoded(backgroundImage)
        if (!cnvsimg) {
            console.error('Failed to create CanvasKit image from encoded data')
            return null
        }
        return cnvsimg
    }

    get paint(): Paint {
        return this.fillPaint!
    }
    get stroke(): Paint {
        return this.strokePaint!
    }

    protected isShader(obj: unknown): boolean {
        // Duck-type: not null, is an object, but not a Float32Array (Color)
        return obj != null && typeof obj === 'object' && !(obj instanceof Float32Array)
    }

    protected isColor(fill: unknown): boolean {
        return fill instanceof Float32Array
    }

    public destroy() {
        this.fillPaint?.delete()
        this.strokePaint?.delete()

        this.fillPaint = null
        this.strokePaint = null
    }
}

export default PaintManager