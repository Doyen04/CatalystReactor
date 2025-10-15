import Handle from '@lib/modifiers/Handles'
import type { Canvas, Rect } from 'canvaskit-wasm'
import { BorderRadius, CornerPos, HandlePos, Properties } from '@lib/types/shapes'
import SimpleRect from './SimpleRect'

class Rectangle extends SimpleRect {
    bdradius: BorderRadius

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super(x, y, { type: 'rect', ...shapeProps })
        this.dimension = { width: 0, height: 0 }

        this.bdradius = {
            'top-left': 0,
            'top-right': 0,
            'bottom-left': 0,
            'bottom-right': 0,
            locked: false,
        }
        this.calculateBoundingRect()
    }

    setBorderRadius(newRadius: number, pos: HandlePos) {
        const max = Math.min(this.dimension.width, this.dimension.height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))
        if (this.bdradius.locked) {
            this.setAllBorderRadius(newRad)
            return
        }

        this.bdradius[pos] = newRad
    }

    private setAllBorderRadius(radius: number): void {
        this.bdradius = {
            'top-left': radius,
            'top-right': radius,
            'bottom-left': radius,
            'bottom-right': radius,
            locked: true,
        }
    }

    // protected flippedRadii = () => {
    //     let radii = structuredClone(this.bdradius)

    //     if (this.transform.isFlippedX && this.transform.isFlippedY) {
    //         // opposite corners
    //         radii = {
    //             'top-left': this.bdradius['bottom-right'],
    //             'top-right': this.bdradius['bottom-left'],
    //             'bottom-right': this.bdradius['top-left'],
    //             'bottom-left': this.bdradius['top-right'],
    //             locked: this.bdradius.locked,
    //         }
    //     } else if (this.transform.isFlippedX) {
    //         // swap left/right
    //         radii = {
    //             'top-left': this.bdradius['top-right'],
    //             'top-right': this.bdradius['top-left'],
    //             'bottom-right': this.bdradius['bottom-left'],
    //             'bottom-left': this.bdradius['bottom-right'],
    //             locked: this.bdradius.locked,
    //         }
    //     } else if (this.transform.isFlippedY) {
    //         // swap top/bottom
    //         radii = {
    //             'top-left': this.bdradius['bottom-left'],
    //             'top-right': this.bdradius['bottom-right'],
    //             'bottom-right': this.bdradius['top-right'],
    //             'bottom-left': this.bdradius['top-left'],
    //             locked: this.bdradius.locked,
    //         }
    //     }

    //     return radii
    // }

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.dimension = prop.size
        this.style = prop.style
        this.bdradius = prop.borderRadius
        this.calculateBoundingRect()
    }

    getBorderRadius() {
        const { width, height } = this.dimension
        const max = Math.min(width, height)

        const temp = this.bdradius

        if (!this.hasRadius()) {
            return { ...temp }
        }

        const radii = {
            'top-left': Math.min(temp['top-left'], max),
            'top-right': Math.min(temp['top-right'], max),
            'bottom-left': Math.min(temp['bottom-left'], max),
            'bottom-right': Math.min(temp['bottom-right'], max),
        }

        const sums = {
            top: radii['top-left'] + radii['top-right'],
            right: radii['top-right'] + radii['bottom-right'],
            bottom: radii['bottom-left'] + radii['bottom-right'],
            left: radii['top-left'] + radii['bottom-left'],
        }

        const scaleRadii = (sum: number, ...corners: (keyof typeof radii)[]) => {
            if (sum > max && sum > 0) {
                const scale = max / sum
                corners.forEach(corner => (radii[corner] *= scale))
            }
        }

        scaleRadii(sums.top, 'top-left', 'top-right')
        scaleRadii(sums.left, 'top-left', 'bottom-left')
        scaleRadii(sums.bottom, 'bottom-left', 'bottom-right')
        scaleRadii(sums.right, 'top-right', 'bottom-right')

        return { ...radii, locked: this.bdradius.locked }
    }

    override getProperties(): Properties {
        return {
            transform: { ...this.transform },
            size: { ...this.dimension },
            style: { ...this.style },
            borderRadius: { ...this.bdradius },
        }
    }

    override getModifierHandles(): Handle[] {
        const handles = super.getModifierHandles()
        CornerPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'radius'))
        })
        return handles
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number } {
        if (handle.type === 'radius') {
            return this.getRadiusModiferHandlesPos(handle)
        } else if (handle.type === 'size' || handle.type === 'angle') {
            return super.getModifierHandlesPos(handle)
        }
        return { x: 0, y: 0 }
    }

    getMaxRadius() {
        return Math.min(this.dimension.width, this.dimension.height) / 2
    }

    //local coord
    getRadiusModiferHandlesPos(handle: Handle): { x: number; y: number } {
        let r = this.bdradius[handle.pos]
        r = Math.min(r, this.getMaxRadius())
        const padding = 15
        const size = handle.size

        let x: number, y: number

        switch (handle.pos) {
            case 'top-left':
                x = (handle.isDragging || r >= padding ? r : padding) - size
                y = (handle.isDragging || r >= padding ? r : padding) - size
                break
            case 'top-right':
                x = this.dimension.width - (handle.isDragging || r >= padding ? r : padding) - size
                y = (handle.isDragging || r >= padding ? r : padding) - size
                break
            case 'bottom-left':
                x = (handle.isDragging || r >= padding ? r : padding) - size
                y = this.dimension.height - (handle.isDragging || r >= padding ? r : padding) - size
                break
            case 'bottom-right':
                x = this.dimension.width - (handle.isDragging || r >= padding ? r : padding) - size
                y = this.dimension.height - (handle.isDragging || r >= padding ? r : padding) - size
                break
        }

        return { x, y }
    }

    hasRadius(): boolean {
        return (
            this.bdradius['top-left'] > 0 || this.bdradius['top-right'] > 0 || this.bdradius['bottom-left'] > 0 || this.bdradius['bottom-right'] > 0
        )
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const { fill, stroke } = this.initPaints(this.style.fill.color, this.style.stroke.color)

        const rect = this.resource.canvasKit.XYWHRect(0, 0, this.dimension.width, this.dimension.height)

        if (this.hasRadius() && this.bdradius.locked) {
            const radius = this.bdradius['top-left']
            const rrect = this.resource.canvasKit.RRectXY(rect, radius, radius)
            canvas.drawRRect(rrect, fill)
            canvas.drawRRect(rrect, stroke)
        } else if (this.hasRadius()) {
            const path = this.makeCustomRRectPath()
            canvas.drawPath(path, fill)
            canvas.drawPath(path, stroke)
            path.delete()
        } else {
            canvas.drawRect(rect, fill)
            canvas.drawRect(rect, stroke)
        }

        this.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas, rect)
        }
    }

    protected drawHoverEffect(canvas: Canvas, rect: Rect): void {
        if (!this.resource) return

        const hoverPaint = this.paintManager.stroke
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1)) // Blue with transparency
        hoverPaint.setStrokeWidth(2)

        if (this.hasRadius() && this.bdradius.locked) {
            const radius = this.bdradius['top-left']
            const rrect = this.resource.canvasKit.RRectXY(rect, radius, radius)
            canvas.drawRRect(rrect, hoverPaint)
        } else if (this.hasRadius()) {
            const path = this.makeCustomRRectPath()
            canvas.drawPath(path, hoverPaint)
            path.delete()
        } else {
            canvas.drawRect(rect, hoverPaint)
        }
    }

    protected makeCustomRRectPath() {
        const radii = this.getBorderRadius()
        const [x, y, w, h] = [0, 0, this.dimension.width, this.dimension.height]
        const CanvasKit = this.resource?.canvasKit

        const p = new this.resource.canvasKit.Path()
        const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = radii

        p.moveTo(x + tl, y)
        p.lineTo(x + w - tr, y)
        if (tr > 0) {
            p.arcToOval(CanvasKit.LTRBRect(x + w - 2 * tr, y, x + w, y + 2 * tr), -90, 90, false)
        }

        p.lineTo(x + w, y + h - br)
        if (br > 0) {
            p.arcToOval(CanvasKit.LTRBRect(x + w - 2 * br, y + h - 2 * br, x + w, y + h), 0, 90, false)
        }

        p.lineTo(x + bl, y + h)
        if (bl > 0) {
            p.arcToOval(CanvasKit.LTRBRect(x, y + h - 2 * bl, x + 2 * bl, y + h), 90, 90, false)
        }

        p.lineTo(x, y + tl)
        if (tl > 0) {
            p.arcToOval(CanvasKit.LTRBRect(x, y, x + 2 * tl, y + 2 * tl), 180, 90, false)
        }

        p.close()
        return p
    }

    override pointInShape(x: number, y: number): boolean {
        return x >= 0 && x <= this.dimension.width && y >= 0 && y <= this.dimension.height
    }

    override cleanUp(): void {}
    override destroy(): void {}
}

export default Rectangle
