import Rectangle from './Rect'
import { Coord, ImageFill, SolidFill } from '@lib/types/shapes'
import type { Image as CanvasKitImage } from 'canvaskit-wasm'

class PImage extends Rectangle {
    imageLoaded: boolean
    constructor(x: number, y: number, imageElem: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer }) {
        super(x, y, { type: 'img' })

        const fill: ImageFill = { type: 'image', imageData: imageElem.imageBuffer, cnvsImage: imageElem.CanvasKitImage, scaleMode: 'fit' }
        const stroke: SolidFill = { type: 'solid', color: '#000' }
        this.style = {
            fill: { color: fill, opacity: 1 },
            stroke: { fill: { color: stroke, opacity: 1 }, width: 1 },
        }
        this.maintainAspectRatio = true
        this.setupImage()
        this.calculateBoundingRect()
    }
    setupImage() {
        const imageFill = this.style.fill.color as ImageFill
        if (imageFill.cnvsImage) {
            const image = imageFill.cnvsImage
            this.aspectRatio = this.calculateAspectRatio(image.width(), image.height())
        }
    }

    override setSize(dragStart: Coord, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        const willFlipX = deltaX < 0
        const willFlipY = deltaY < 0

        this.transform.scaleX = willFlipX ? -1 : 1
        this.transform.scaleY = willFlipY ? -1 : 1

        if (shiftKey || this.maintainAspectRatio) {
            // When shift is held OR aspect ratio should be maintained
            let newWidth: number
            let newHeight: number

            if (this.maintainAspectRatio && !shiftKey) {
                // Maintain original image aspect ratio
                const absX = Math.abs(deltaX)
                const absY = Math.abs(deltaY)

                // Use whichever gives us the larger size (following the mouse better)
                if (absX / this.aspectRatio >= absY) {
                    // Width change is dominant
                    newWidth = absX
                    newHeight = absX / this.aspectRatio
                } else {
                    // Height change is dominant
                    newHeight = absY
                    newWidth = absY * this.aspectRatio
                }
            } else {
                // Shift key held - make square (1:1 aspect ratio)
                const size = Math.max(Math.abs(deltaX), Math.abs(deltaY))
                newWidth = size
                newHeight = size
            }

            this.dimension.width = newWidth
            this.dimension.height = newHeight
        } else {
            // Free resizing without aspect ratio constraint
            this.dimension.width = Math.abs(deltaX)
            this.dimension.height = Math.abs(deltaY)
            this.transform.x = Math.min(dragStart.x, mx)
            this.transform.y = Math.min(dragStart.y, my)
        }

        this.calculateBoundingRect()
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
    override cleanUp(): void {}
    override destroy(): void {
        this.aspectRatio = null
        this.maintainAspectRatio = null
    }
}

export default PImage
