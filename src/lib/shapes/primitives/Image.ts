import Rectangle from './Rect'
import { ImageFill, SolidFill } from '@lib/types/shapes'
import type { Image as CanvasKitImage } from 'canvaskit-wasm'

class PImage extends Rectangle {
    imageLoaded: boolean
    constructor(x: number, y: number, imageElem: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer, name:string }) {
        super(x, y, { type: 'img' })

        this.paintManager.imageCache.set(imageElem.name, imageElem.CanvasKitImage)
        const fill: ImageFill = { type: 'image', imageData: { imageBuffer: imageElem.imageBuffer, name:imageElem.name },scaleMode: 'fit' }
        const stroke: SolidFill = { type: 'solid', color: '#000' }
        this.style = {
            fill: { color: fill, opacity: 1 },
            stroke: { color: stroke, opacity: 1, width: 1 },
        }
        this.maintainAspectRatio = true
        this.setupImage()
        this.calculateBoundingRect()
    }
    setupImage() {
        const imageFill = this.style.fill.color as ImageFill
        const cnvsImage = this.paintManager.imageCache.get(imageFill.imageData.name)
        if (cnvsImage) {
            const image = cnvsImage
            this.aspectRatio = this.calculateAspectRatio(image.width(), image.height())
        }
    }

    private calculateAspectRatio(width: number, height: number): number {
        if (height === 0) {
            console.warn('Image height is 0, defaulting aspect ratio to 1')
            return 1
        }
        return width / height
    }

    private getGCD(a: number, b: number): number {
        return b === 0 ? a : this.getGCD(b, a % b)
    }

    getSimplifiedAspectRatio(): string {
        const gcd = this.getGCD(this.dimension.width, this.dimension.height)
        const simplifiedWidth = this.dimension.width / gcd
        const simplifiedHeight = this.dimension.height / gcd
        return `${simplifiedWidth}:${simplifiedHeight}`
    }
    override cleanUp(): void { }
    override destroy(): void {
        this.aspectRatio = null
        this.maintainAspectRatio = null
    }
}

export default PImage
