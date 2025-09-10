// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import Handle from '@lib/modifiers/Handles'
import { CanvasKitResources } from '@lib/core/CanvasKitResource'
import {
    BoundingRect,
    Coord,
    CornerPos,
    FillStyle,
    ImageFill,
    IShape,
    LinearGradient,
    Properties,
    RadialGradient,
    ScaleMode,
    ShapeType,
    Size,
    SolidFill,
    Style,
    Transform,
} from '@lib/types/shapes'
import type { Canvas, Image as CanvasKitImage, Color, Paint, Shader } from 'canvaskit-wasm'

interface Arguments {
    x: number
    y: number
    type: ShapeType
    rotation?: number
    scale?: number
    _fill?: string
    strokeWidth?: number
    strokeColor?: string
}

abstract class Shape implements IShape {
    protected IWidth: number
    protected IHeight: number
    protected aspectRatio: number = 1
    protected maintainAspectRatio: boolean = false
    protected shapeType: ShapeType
    protected transform: Transform
    protected style: Style
    protected boundingRect: BoundingRect
    protected isHover: boolean
    protected rotationAnchorPosition: Coord

    constructor({ x, y, type, rotation = 0, scale = 1, _fill = '#fff', strokeWidth = 1, strokeColor = '#000' }: Arguments) {
        if (new.target === Shape) throw new Error('Shape is abstract; extend it!')
        this.transform = {
            x,
            y,
            rotation,
            scaleX: scale,
            scaleY: scale,
            anchorPoint: { x: 0, y: 0 },
        }
        this.rotationAnchorPosition = { x: 0.5, y: 0.5 }

        const fill: SolidFill = { type: 'solid', color: _fill }
        const stroke: SolidFill = { type: 'solid', color: strokeColor }
        this.style = {
            fill: { color: fill, opacity: 1 },
            stroke: { fill: { color: stroke, opacity: 1 }, width: strokeWidth },
        }
        this.boundingRect = { top: 0, left: 0, bottom: 0, right: 0 }
        this.isHover = false
        this.shapeType = type
    }

    abstract getCenterCoord(): Coord
    abstract getModifierHandles(): Handle[]
    abstract getModifierHandlesPos(handle: Handle): { x: number; y: number }
    abstract pointInShape(x: number, y: number): boolean
    abstract moveShape(mx: number, my: number): void
    abstract calculateBoundingRect(): void
    abstract setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void
    abstract draw(canvas: Canvas): void
    abstract setDim(width: number, height: number): void
    abstract getDim(): { width: number; height: number }
    abstract setCoord(x: number, y: number): void
    abstract getProperties(): Properties
    abstract setProperties(prop: Properties): void
    abstract cleanUp(): void

    getShapeType(): ShapeType {
        return this.shapeType
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

    getRelativeBoundingRect(): BoundingRect {
        return structuredClone(this.boundingRect)
    }

    getRotationAnchorPoint() {
        return this.rotationAnchorPosition
    }

    getAngleModifierHandles(): Handle[] {
        const handles: Handle[] = []
        CornerPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'angle'))
        })
        return handles
    }

    //local coord
    getAngleModifierHandlesPos(handle: Handle): Coord {
        const dimen = this.getDim()
        const bRect = {
            left: 0,
            top: 0,
            right: dimen.width,
            bottom: dimen.height,
        }
        const size = handle.size / 2

        const padding = handle.size

        switch (handle.pos) {
            case 'top-left':
                return {
                    x: bRect.left - size - padding,
                    y: bRect.top - size - padding,
                }
            case 'top-right':
                return {
                    x: bRect.right - size + padding,
                    y: bRect.top - size - padding,
                }
            case 'bottom-left':
                return {
                    x: bRect.left - size - padding,
                    y: bRect.bottom - size + padding,
                }
            case 'bottom-right':
                return {
                    x: bRect.right - size + padding,
                    y: bRect.bottom - size + padding,
                }
            default:
                return { x: 0, y: 0 }
        }
    }

    getSizeModifierHandles(): Handle[] {
        const handles: Handle[] = []
        CornerPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'size'))
        })
        return handles
    }

    //local coord
    getSizeModifierHandlesPos(handle: Handle): Coord {
        const dimen = this.getDim()
        const bRect = {
            left: 0,
            top: 0,
            right: dimen.width,
            bottom: dimen.height,
        }
        const size = handle.size / 2

        switch (handle.pos) {
            case 'top-left':
                return { x: bRect.left - size, y: bRect.top - size }
            case 'top-right':
                return { x: bRect.right - size, y: bRect.top - size }
            case 'bottom-left':
                return { x: bRect.left - size, y: bRect.bottom - size }
            case 'bottom-right':
                return { x: bRect.right - size, y: bRect.bottom - size }
            default:
                return { x: 0, y: 0 }
        }
    }

    getCoord(): Coord {
        return { x: this.transform.x, y: this.transform.y }
    }

    drawDefault() {
        const defSize = 100
        this.setDim(defSize, defSize)
        this.setCoord(this.transform.x - defSize / 2, this.transform.y - defSize / 2)
    }

    protected isShader(obj): boolean {
        return obj != null && typeof obj === 'object' && obj.constructor?.name === 'Shader'
    }

    protected isColor(fill): boolean {
        return fill instanceof Float32Array
    }

    getRotationAngle(): number {
        return this.transform.rotation || 0
    }

    getScale(): { x: number; y: number } {
        return {
            x: this.transform.scaleX || 1,
            y: this.transform.scaleY || 1,
        }
    }

    setAngle(angle: number): void {
        this.transform.rotation = angle
        // this.style.strokeColor = color;
    }

    setAnchorPoint(anchor: Coord): void {
        console.log('not yet implemented', anchor)
        // this.transform.anchorPoint = anchor
    }

    setStrokeColor(stroke: string | number[]): void {
        console.log(stroke)
    }

    setScale(x: number, y: number): void {
        this.transform.scaleX = x
        this.transform.scaleY = y
    }

    setStrokeWidth(width: number): void {
        console.log(width)

        // this.style.strokeWidth = width;
    }

    setFill(color: string): void {
        console.log(color)

        //     this.style.fill = color;
    }

    setHovered(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHover = bool
    }

    //better management for canvaskit resources
    private setPaint(fill: FillStyle): Color | Shader | null {
        if (!this.resource) return
        switch (fill.type) {
            case 'solid': {
                const solid = fill as SolidFill
                const value = Array.isArray(solid.color) ? new Float32Array(solid.color) : this.resource.canvasKit.parseColorString(solid.color)
                return value
            }
            case 'linear': {
                const gradient = fill as LinearGradient
                const size = this.getDim()

                const x1 = (gradient.x1 / 100) * size.width
                const y1 = (gradient.y1 / 100) * size.height
                const x2 = (gradient.x2 / 100) * size.width
                const y2 = (gradient.y2 / 100) * size.height

                const shader = this.resource.canvasKit.Shader.MakeLinearGradient(
                    [x1, y1],
                    [x2, y2],
                    gradient.stops.map(stop => this.resource.canvasKit.parseColorString(stop.color)),
                    gradient.stops.map(stop => stop.offset),
                    this.resource.canvasKit.TileMode.Clamp
                )
                return shader
            }
            case 'radial': {
                const gradient = fill as RadialGradient
                const size = this.getDim()

                // Calculate center point
                const centerX = (gradient.cx / 100) * size.width
                const centerY = (gradient.cy / 100) * size.height

                // Calculate radius as percentage of the larger dimension
                const maxDimension = Math.max(size.width, size.height)
                const radius = (gradient.radius / 100) * maxDimension

                const shader = this.resource.canvasKit.Shader.MakeRadialGradient(
                    [centerX, centerY],
                    radius,
                    gradient.stops.map(stop => this.resource.canvasKit.parseColorString(stop.color)),
                    gradient.stops.map(stop => stop.offset),
                    this.resource.canvasKit.TileMode.Clamp
                )
                return shader
            }
            case 'image': {
                const imageFill = fill as ImageFill
                if (!imageFill.cnvsImage && imageFill.imageData) {
                    const image = this.createCanvasKitImage(imageFill.imageData)
                    imageFill.cnvsImage = image
                }
                const size = this.getDim()
                const shader = this.makeImageShader(size, imageFill.cnvsImage, imageFill.scaleMode)
                return shader
            }
            case 'pattern':
                // Similar to image but with pattern-specific handling
                break
        }
    }

    protected initPaints(): { stroke: Paint; fill: Paint } {
        const fillShader = this.setPaint(this.style.fill.color)
        const strokeShader = this.setPaint(this.style.stroke.fill.color)

        if (this.isColor(fillShader)) {
            this.resource.paint.setColor(fillShader as Color)
        } else if (this.isShader(fillShader)) {
            this.resource.paint.setShader(fillShader as Shader)
        }
        this.resource.paint.setAlphaf(this.style.fill.opacity)

        if (this.isColor(strokeShader)) {
            this.resource.strokePaint.setColor(strokeShader as Color)
        } else if (this.isShader(strokeShader)) {
            this.resource.strokePaint.setShader(strokeShader as Shader)
        }
        this.resource.strokePaint.setAlphaf(this.style.stroke.fill.opacity)

        this.resource.strokePaint.setStrokeWidth(this.style.stroke.width)
        return { stroke: this.resource.strokePaint, fill: this.resource.paint }
    }

    protected resetPaint() {
        this.resource.paint.setShader(null)
        this.resource.strokePaint.setShader(null)

        this.resource.paint.setAlphaf(1.0)
        this.resource.strokePaint.setAlphaf(1.0)
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

        return canvasKitImage.makeShaderOptions(tileMode, tileMode, ck.FilterMode.Linear, ck.MipmapMode.None, finalMatrix)
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
    abstract destroy(): void
}
export default Shape
