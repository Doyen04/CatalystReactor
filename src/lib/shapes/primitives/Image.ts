import Rectangle from './Rect'
import { ImageFill, SolidFill } from '@lib/types/shapes'
import type { Image as CanvasKitImage } from 'canvaskit-wasm'
import { ShapeData } from '@lib/core/EngineStateStore'

class PImage extends Rectangle {
    constructor(data: ShapeData, imageElem?: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer, name: string }) {
        super(data)

        if (imageElem) {
            this.paintManager.imageCache.set(imageElem.name, imageElem.CanvasKitImage)
            const fill: ImageFill = { type: 'image', imageData: { imageBuffer: imageElem.imageBuffer, name: imageElem.name }, scaleMode: 'fit' }
            const stroke: SolidFill = { type: 'solid', color: '#000' }
            
            this.data.properties.style = {
                fill: { color: fill, opacity: 1 },
                stroke: { color: stroke, opacity: 1, width: 1 },
            }
        }
        
        this.maintainAspectRatio = true
        this.setupImage()
    }

    private setupImage() {
        const fill = this.data.properties.style.fill.color
        if (fill && typeof fill === 'object' && 'type' in fill && fill.type === 'image') {
            const imageFill = fill as ImageFill
            const cnvsImage = this.paintManager.imageCache.get(imageFill.imageData.name)
            if (cnvsImage) {
                this.aspectRatio = this.calculateAspectRatio(cnvsImage.width(), cnvsImage.height())
            }
        }
    }

    private calculateAspectRatio(width: number, height: number): number {
        if (height === 0) return 1
        return width / height
    }

    private getGCD(a: number, b: number): number {
        return b === 0 ? a : this.getGCD(b, a % b)
    }

    getSimplifiedAspectRatio(): string {
        const { width, height } = this.data.properties.size
        const gcd = this.getGCD(width, height)
        const simplifiedWidth = width / gcd
        const simplifiedHeight = height / gcd
        return `${simplifiedWidth}:${simplifiedHeight}`
    }

    override cleanUp(): void { }
    override destroy(): void {
        // Cleaning up any specific PImage state if needed
    }
}

export default PImage
