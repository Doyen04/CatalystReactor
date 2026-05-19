import type { Canvas, Rect } from 'canvaskit-wasm'
import { BorderRadius, CornerPos, HandlePos, Properties, Coord } from '@lib/types/shapes'
import SimpleRect from './SimpleRect'
import { ShapeData } from '@lib/core/EngineStateStore'

class Rectangle extends SimpleRect {
    constructor(data: ShapeData) {
        super(data)
    }

    override setBorderRadius(newRadius: number, pos: HandlePos) {
        const { width, height } = this.data.properties.size
        const borderRadius = this.data.properties.borderRadius!
        const max = Math.min(width, height) / 2
        const newRad = Math.max(0, Math.min(newRadius, max))
        
        if (borderRadius.locked) {
            this.setAllBorderRadius(newRad)
            return
        }

        borderRadius[pos] = newRad
    }

    private setAllBorderRadius(radius: number): void {
        const borderRadius = this.data.properties.borderRadius!
        borderRadius['top-left'] = radius
        borderRadius['top-right'] = radius
        borderRadius['bottom-left'] = radius
        borderRadius['bottom-right'] = radius
        borderRadius.locked = true
    }

    getBorderRadius() {
        const { width, height } = this.data.properties.size
        const max = Math.min(width, height)
        const borderRadius = this.data.properties.borderRadius!

        if (!this.hasRadius()) {
            return { ...borderRadius }
        }

        const radii = {
            'top-left': Math.min(borderRadius['top-left'], max),
            'top-right': Math.min(borderRadius['top-right'], max),
            'bottom-left': Math.min(borderRadius['bottom-left'], max),
            'bottom-right': Math.min(borderRadius['bottom-right'], max),
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

        return { ...radii, locked: borderRadius.locked }
    }

    override drawModifierHandles(canvas: Canvas, resource: any): void {
        super.drawModifierHandles(canvas, resource)
        const cw = resource.canvasKit
        const paint = new cw.Paint()
        paint.setColor(cw.Color(255, 255, 255, 1))
        paint.setStyle(cw.PaintStyle.Fill)
        
        const stroke = new cw.Paint()
        stroke.setColor(cw.Color(0, 0, 255, 1))
        stroke.setStyle(cw.PaintStyle.Stroke)
        stroke.setStrokeWidth(1.5)

        const drawCircle = (x: number, y: number) => {
            canvas.drawCircle(x, y, 4, paint)
            canvas.drawCircle(x, y, 4, stroke)
        }

        const { width, height } = this.data.properties.size
        const borderRadius = this.data.properties.borderRadius!
        let tl = Math.min(borderRadius['top-left'] as number, this.getMaxRadius())
        let tr = Math.min(borderRadius['top-right'] as number, this.getMaxRadius())
        let bl = Math.min(borderRadius['bottom-left'] as number, this.getMaxRadius())
        let br = Math.min(borderRadius['bottom-right'] as number, this.getMaxRadius())

        const pad = 15
        tl = tl >= pad ? tl : pad; tr = tr >= pad ? tr : pad
        bl = bl >= pad ? bl : pad; br = br >= pad ? br : pad

        drawCircle(tl, tl)
        drawCircle(width - tr, tr)
        drawCircle(bl, height - bl)
        drawCircle(width - br, height - br)

        paint.delete(); stroke.delete()
    }

    override hitTestModifierHandle(x: number, y: number): string | null {
        // Base checks scaling and rotation first
        const base = super.hitTestModifierHandle(x, y)
        if (base) return base

        const { width, height } = this.data.properties.size
        const borderRadius = this.data.properties.borderRadius!
        const pad = 15
        let tl = Math.min(borderRadius['top-left'] as number, this.getMaxRadius()); tl = tl >= pad ? tl : pad
        let tr = Math.min(borderRadius['top-right'] as number, this.getMaxRadius()); tr = tr >= pad ? tr : pad
        let bl = Math.min(borderRadius['bottom-left'] as number, this.getMaxRadius()); bl = bl >= pad ? bl : pad
        let br = Math.min(borderRadius['bottom-right'] as number, this.getMaxRadius()); br = br >= pad ? br : pad

        const s = 10 // hit pad
        if (Math.abs(x - tl) <= s && Math.abs(y - tl) <= s) return 'radius-top-left'
        if (Math.abs(x - (width - tr)) <= s && Math.abs(y - tr) <= s) return 'radius-top-right'
        if (Math.abs(x - bl) <= s && Math.abs(y - (height - bl)) <= s) return 'radius-bottom-left'
        if (Math.abs(x - (width - br)) <= s && Math.abs(y - (height - br)) <= s) return 'radius-bottom-right'

        return null
    }

    override dragModifierHandle(handleID: string, localCurrent: Coord, localStart: Coord, initialShapeData: any): void {
        if (handleID.startsWith('radius-')) {
            const pos = handleID.replace('radius-', '') as HandlePos
            const { width, height } = this.data.properties.size
            const { x, y } = localCurrent

            let distX = 0, distY = 0, newRadius = 0
            switch (pos) {
                case 'top-left':
                    distX = x; distY = y
                    if (distX >= 0 && distY >= 0) newRadius = Math.min(distX, distY)
                    break
                case 'top-right':
                    distX = x - width; distY = y
                    if (distX <= 0 && distY >= 0) newRadius = Math.min(Math.abs(distX), distY)
                    break
                case 'bottom-left':
                    distX = x; distY = y - height
                    if (distX >= 0 && distY <= 0) newRadius = Math.min(distX, Math.abs(distY))
                    break
                case 'bottom-right':
                    distX = x - width; distY = y - height
                    if (distX <= 0 && distY <= 0) newRadius = Math.min(Math.abs(distX), Math.abs(distY))
                    break
            }
            this.setBorderRadius(newRadius, pos)
        }
    }

    hasRadius(): boolean {
        const borderRadius = this.data.properties.borderRadius!
        return (
            borderRadius['top-left'] > 0 || borderRadius['top-right'] > 0 || borderRadius['bottom-left'] > 0 || borderRadius['bottom-right'] > 0
        )
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const dim = this.getDim()
        const properties = this.data.properties
        const borderRadius = properties.borderRadius!
        const fill = this.paintManager.initFillPaint(properties.style.fill, dim)
        const stroke = this.paintManager.initStrokePaint(properties.style.stroke, dim)

        const rect = this.resource.canvasKit.XYWHRect(0, 0, dim.width, dim.height)

        if (this.hasRadius() && borderRadius.locked) {
            const radius = borderRadius['top-left']
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

        this.paintManager.resetPaint()
        if (this.isHover) {
            this.drawHoverEffect(canvas, rect)
        }
    }

    protected override drawHoverEffect(canvas: Canvas, rect: any): void {
        if (!this.resource) return

        const borderRadius = this.data.properties.borderRadius!
        const hoverPaint = this.paintManager.stroke
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1)) // Blue with transparency
        hoverPaint.setStrokeWidth(2)

        if (this.hasRadius() && borderRadius.locked) {
            const radius = borderRadius['top-left']
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
        const { width, height } = this.data.properties.size
        const [x, y, w, h] = [0, 0, width, height]
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
        const { width, height } = this.data.properties.size
        return x >= 0 && x <= width && y >= 0 && y <= height
    }

    override convertToPathData(): any {
        const { width, height } = this.data.properties.size
        const points: any[] = []

        if (!this.hasRadius()) {
            points.push({ x: 0, y: 0, smooth: false })
            points.push({ x: width, y: 0, smooth: false })
            points.push({ x: width, y: height, smooth: false })
            points.push({ x: 0, y: height, smooth: false })
            return { points, closed: true }
        }

        const radii = this.getBorderRadius()
        const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = radii
        const k = 0.552284749831

        if (tl > 0) {
            points.push({ x: 0, y: tl, cp1: { x: 0, y: tl * (1 - k) } })
            points.push({ x: tl, y: 0, cp2: { x: tl * (1 - k), y: 0 } })
        } else {
            points.push({ x: 0, y: 0 })
        }

        if (tr > 0) {
            points.push({ x: width - tr, y: 0, cp1: { x: width - tr * (1 - k), y: 0 } })
            points.push({ x: width, y: tr, cp2: { x: width, y: tr * (1 - k) } })
        } else {
            points.push({ x: width, y: 0 })
        }

        if (br > 0) {
            points.push({ x: width, y: height - br, cp1: { x: width, y: height - br * (1 - k) } })
            points.push({ x: width - br, y: height, cp2: { x: width - br * (1 - k), y: height } })
        } else {
            points.push({ x: width, y: height })
        }

        if (bl > 0) {
            points.push({ x: bl, y: height, cp1: { x: bl * (1 - k), y: height } })
            points.push({ x: 0, y: height - bl, cp2: { x: 0, y: height - bl * (1 - k) } })
        } else {
            points.push({ x: 0, y: height })
        }

        return { points, closed: true }
    }

    override cleanUp(): void { }
    override destroy(): void { }
}

export default Rectangle
