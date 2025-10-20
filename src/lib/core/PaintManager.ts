import type { Color, Shader, Image as CanvasKitImage, Paint } from "canvaskit-wasm"
import CanvasKitResources from "./CanvasKitResource"
import { SolidFill, LinearGradient, RadialGradient, ImageFill, Size, ScaleMode, PaintStyle, ColorProps, Stroke } from "@lib/types/shapes"
import { PCache } from "./Cache"

class PaintManager {
    private fillPaint: Paint
    private strokePaint: Paint
    private paintCache: PCache<Paint>
    shaderCache: PCache<Shader>
    imageCache: PCache<CanvasKitImage>

    constructor() {
        this.paintCache = new PCache<Paint>()
        this.shaderCache = new PCache<Shader>()
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

    private round(n: number, p = 3) {
        const f = Math.pow(10, p)
        return Math.round(n * f) / f
    }

    private normColorKey(input: string | number[]) {
        if (Array.isArray(input)) return input.join(',')
        return input.trim().toLowerCase()
    }

    setPaint(fill: PaintStyle, size: Size): Color | Shader | null {
        if (!this.resource) return
        switch (fill.type) {
            case 'solid': {
                const solid = fill as SolidFill
                const value = Array.isArray(solid.color) ? new Float32Array(solid.color) : this.resource.canvasKit.parseColorString(solid.color)
                return value
            }
            case 'linear': {
                const gradient = fill as LinearGradient

                const x1 = (gradient.x1 / 100) * size.width
                const y1 = (gradient.y1 / 100) * size.height
                const x2 = (gradient.x2 / 100) * size.width
                const y2 = (gradient.y2 / 100) * size.height

                // const stops = gradient.stops.map(s => `${this.normColorKey(s.color)}@${this.round(s.offset)}`).join('|')
                // const key = `linear:${x1},${y1},${x2},${y2}|${stops}`
                // const cached = this.shaderCache.get(key)
                // if (cached) return cached

                const shader = this.resource.canvasKit.Shader.MakeLinearGradient(
                    [x1, y1],
                    [x2, y2],
                    gradient.stops.map(stop => this.resource.canvasKit.parseColorString(stop.color)),
                    gradient.stops.map(stop => stop.offset),
                    this.resource.canvasKit.TileMode.Clamp
                )

                // this.shaderCache.set(key, shader)
                return shader
            }
            case 'radial': {
                const gradient = fill as RadialGradient

                // Calculate center point
                const centerX = (gradient.cx / 100) * size.width
                const centerY = (gradient.cy / 100) * size.height

                // Calculate radius as percentage of the larger dimension
                const maxDimension = Math.max(size.width, size.height)
                const radius = (gradient.radius / 100) * maxDimension

                // const stops = gradient.stops.map(s => `${this.normColorKey(s.color)}@${this.round(s.offset)}`).join('|')
                // const key = `radial:${centerX},${centerY},${radius}|${stops}`
                // const cached = this.shaderCache.get(key)
                // if (cached) return cached

                const shader = this.resource.canvasKit.Shader.MakeRadialGradient(
                    [centerX, centerY], 
                    radius,
                    gradient.stops.map(stop => this.resource.canvasKit.parseColorString(stop.color)),
                    gradient.stops.map(stop => stop.offset),
                    this.resource.canvasKit.TileMode.Clamp
                )

                // this.shaderCache.set(key, shader)
                return shader
            }
            case 'image': {
                const { imageData, scaleMode } = fill as ImageFill

                let cnvsImage = this.imageCache.get(imageData.name)

                if (!cnvsImage && imageData.imageBuffer) {
                    cnvsImage = this.createCanvasKitImage(imageData.imageBuffer)
                    this.imageCache.set(imageData.name, cnvsImage)
                }

                // const shaderKey = `${imageData.name}:${scaleMode}:${Math.round(size.width)}x${Math.round(size.height)}`

                // // //size is first zero then real size was gotten making the shader invalid
                // const storedShader = this.shaderCache.get(shaderKey)
                // this.shaderCache.log()
                // if (storedShader) return storedShader

                // if (!size || !cnvsImage || (size.width === 0 && size.height === 0)) return null

                const shader = this.makeImageShader(size, cnvsImage, scaleMode)

                // if (shader) this.shaderCache.set(shaderKey, shader)
                return shader
            }
            case 'pattern':
                // Similar to image but with pattern-specific handling
                break
            default:
                console.warn(`Unknown fill type: ${fill}`);
                return this.resource.canvasKit.parseColorString('#000')
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

    makeNewPaint(props: ColorProps | Stroke, size: Size, isStroke = false): Paint {
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
    }

    makeImageShader(dim: Size, canvasKitImage: CanvasKitImage, scaleMode: ScaleMode = 'fill'): Shader {
        if (!this.resource?.canvasKit) return null
        const ck = this.resource.canvasKit

        const imageWidth = canvasKitImage.width()
        const imageHeight = canvasKitImage.height()

        let scale: number
        let tileMode = ck.TileMode.Clamp
        let offsetX = 0
        let offsetY = 0
        let scaledWidth = 0
        let scaledHeight = 0

        switch (scaleMode) {
            case 'fill':
                scale = Math.max(dim.width / imageWidth, dim.height / imageHeight)
                scaledWidth = imageWidth * scale
                scaledHeight = imageHeight * scale

                offsetX = (dim.width - scaledWidth) / 2
                offsetY = (dim.height - scaledHeight) / 2
                break
            case 'fit':
                scale = Math.min(dim.width / imageWidth, dim.height / imageHeight)
                scaledWidth = imageWidth * scale
                scaledHeight = imageHeight * scale

                offsetX = (dim.width - scaledWidth) / 2
                offsetY = (dim.height - scaledHeight) / 2
                tileMode = ck.TileMode.Decal
                break
            case 'tile':
                scale = 1
                tileMode = ck.TileMode.Repeat
                break
            case 'stretch':
                return canvasKitImage.makeShaderOptions(
                    ck.TileMode.Clamp,
                    ck.TileMode.Clamp,
                    ck.FilterMode.Linear,
                    ck.MipmapMode.None,
                    ck.Matrix.scaled(dim.width / imageWidth, dim.height / imageHeight)
                )
            default:
                scale = Math.max(dim.width / imageWidth, dim.height / imageHeight)
        }

        // Calculate centering offset for fill/fit modes
        const scaleX = scale
        const scaleY = scale

        const finalMatrix = ck.Matrix.multiply(ck.Matrix.translated(offsetX, offsetY), ck.Matrix.scaled(scaleX, scaleY))

        return canvasKitImage.makeShaderOptions(tileMode, tileMode, ck.FilterMode.Linear, ck.MipmapMode.Linear, finalMatrix)
    }

    createCanvasKitImage(backgroundImage: ArrayBuffer): CanvasKitImage | null {
        if (!backgroundImage || !this.resource?.canvasKit) return null

        const cnvsimg = this.resource.canvasKit.MakeImageFromEncoded(backgroundImage)
        if (!cnvsimg) {
            console.error('Failed to create CanvasKit image from encoded data')
            return
        }
        return cnvsimg
    }

    get paint() {
        return this.fillPaint
    }
    get stroke() {
        return this.strokePaint
    }

    protected isShader(obj): boolean {
        return obj != null && typeof obj === 'object' && obj.constructor?.name === 'Shader'
    }

    protected isColor(fill): boolean {
        return fill instanceof Float32Array
    }

    public destroy() {
        this.fillPaint.delete()
        this.strokePaint.delete()

        this.fillPaint = null
        this.strokePaint = null
    }
}

export default PaintManager