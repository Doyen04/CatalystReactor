import Rectangle from './Rect'
import { Coord, ImageFill, SolidFill } from '@lib/types/shapes'

class PImage extends Rectangle {
    constructor(x: number, y: number, imageElem: ArrayBuffer) {
        super(x, y, { type: 'img' })

        this.maintainAspectRatio = true
        const fill: ImageFill = { type: 'image', imageData: imageElem, scaleMode: 'fit' }
        const stroke: SolidFill = { type: 'solid', color: '#000' }
        this.style = {
            fill: { color: fill, opacity: 1 },
            stroke: { fill: { color: stroke, opacity: 1 }, width: 1 },
        }
        this.calculateBoundingRect()
    }

    override setSize(dragStart: Coord, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
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

    // override draw(canvas: Canvas): void {
    //     if (!this.resource?.canvasKit) return

    //     const ck = this.resource.canvasKit
    //     const { fill, stroke } = this.initPaints()

    //     const rect = ck.XYWHRect(0, 0, this.dimension.width, this.dimension.height)

    //     if (this.hasRadius() && this.bdradius.locked) {
    //         const radius = this.bdradius['top-left']
    //         const rrect = ck.RRectXY(rect, radius, radius)
    //         canvas.drawRRect(rrect, fill)
    //         canvas.drawRRect(rrect, stroke)
    //     } else if (this.hasRadius()) {
    //         const path = this.makeCustomRRectPath()
    //         canvas.drawPath(path, fill)
    //         canvas.drawPath(path, stroke)
    //     } else {
    //         canvas.drawRect(rect, fill)
    //         canvas.drawRect(rect, stroke)
    //     }

    //     this.resetPaint()
    // }
    override cleanUp(): void {}
    override destroy(): void {
        this.aspectRatio = null
        this.maintainAspectRatio = null
        this.IWidth = 0
        this.IHeight = 0
    }
}

export default PImage
