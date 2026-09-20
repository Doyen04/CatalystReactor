import Shape from '../base/Shape'
import type { Canvas, Font, Typeface, Path } from 'canvaskit-wasm'
import type { ShapeData } from '@lib/core/EngineStateStore'

interface SimpleTextStyle {
    textColor: number[]
    fontSize: number
    fontFamily: string[]
}

interface GlyphPathTypeface extends Typeface {
    getGlyphPath(glyphId: number): Path | null
    getUnitsPerEm(): number
}

class SText extends Shape {
    private font: Font | null = null
    private typeface: Typeface | null = null
    private padding: number = 2
    private TWidth: number = 0
    private THeight: number = 0
    private _style: SimpleTextStyle = {
        textColor: [1, 1, 1, 1],
        fontSize: 10,
        fontFamily: ['Inter', 'sans-serif'],
    }

    constructor(data: ShapeData) {
        super(data)

        if (!this.data) {
            console.warn('SText: data is missing')
            return
        }

        if (!this.data.properties) {
            this.data.properties = {
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
                size: { width: 0, height: 0 },
                style: {
                    fill: { color: { type: 'solid', color: '#D9D9D9' }, opacity: 1 },
                    stroke: { color: { type: 'solid', color: '#000000' }, opacity: 1, width: 1 },
                },
            }
        }

        // _style is the private rendering style for this internal text label.
        // It is intentionally separate from data.properties.textStyle (PTextStyle).

        if (this.data.properties.text === undefined) {
            this.data.properties = { ...this.data.properties, text: '' }
        }

        if (this.resource && this.resource.canvasKit && this.resource.fontData && this.resource.fontData[0]) {
            this.typeface = this.resource.canvasKit.Typeface.MakeFreeTypeFaceFromData(this.resource.fontData[0])
            this.font = new this.resource.canvasKit.Font(this.typeface, this.textStyle.fontSize)
            this.calculateTextDim()
        } else {
            console.warn('SText: Resource or font data not available during initialization')
        }
    }

    get text(): string {
        return this.data.properties.text || ''
    }

    get textStyle(): SimpleTextStyle {
        return this._style
    }

    override setDim(width: number, height: number): void {
        this.data.properties.size.width = width
        this.data.properties.size.height = height
    }

    setText(text: string): void {
        this.data.properties = { ...this.data.properties, text }
        this.calculateTextDim()
    }

    override setFontSize(size: number): void {
        this._style.fontSize = size
        this.font?.setSize(size)
        this.calculateTextDim()
    }

    override setFontFamily(fontFamily: string): void {
        this._style.fontFamily.unshift(fontFamily)
        this.calculateTextDim()
    }

    override getCenterCoord() {
        const dim = this.getDim()
        return {
            x: dim.width / 2,
            y: dim.height / 2,
        }
    }

    override getDim(): { width: number; height: number } {
        const { width, height } = this.data.properties.size
        return {
            width: (width || this.TWidth) + this.padding * 2,
            height: (height || this.THeight) + this.padding * 2,
        }
    }

    private calculateTextDim(): void {
        if (!this.font || !this.text) {
            this.TWidth = 0
            this.THeight = 0
            return
        }
        const glyphs = this.font.getGlyphIDs(this.text)
        const widths = this.font.getGlyphWidths(glyphs)
        const metrics = this.font.getMetrics()
        this.TWidth = widths.reduce((a, w) => a + w, 0)
        this.THeight = metrics.descent - metrics.ascent
    }

    private setTextPaint(fill: number[] | string, strokeColor?: number[] | string) {
        const size = this.getDim()

        const fillPaint = this.paintManager.getPaint({
            color: { type: 'solid', color: fill },
            opacity: 1,
            size,
        })

        let strokePaint = fillPaint
        if (strokeColor) {
            strokePaint = this.paintManager.getPaint({
                color: { type: 'solid', color: strokeColor },
                opacity: 1,
                size,
                stroke: true,
                strokeWidth: 1,
            })
        }

        return { fill: fillPaint, stroke: strokePaint }
    }

    override getPath(): Path | null {
        if (!this.resource || !this.font || !this.text) return null
        const ck = this.resource.canvasKit
        const typeface = this.font.getTypeface()
        if (!typeface) return null

        const glyphs = this.font.getGlyphIDs(this.text)
        const widths = this.font.getGlyphWidths(glyphs)
        const metrics = this.font.getMetrics()
        const masterPath = new ck.Path()

        const baselineY = this.padding - metrics.ascent
        let currentX = this.padding

        for (let i = 0; i < glyphs.length; i++) {
            const glyphPath = (typeface as GlyphPathTypeface).getGlyphPath(glyphs[i])
            if (glyphPath) {
                const scale = this.textStyle.fontSize / (typeface as GlyphPathTypeface).getUnitsPerEm()
                const matrix = ck.Matrix.multiply(ck.Matrix.translated(currentX, baselineY), ck.Matrix.scaled(scale, -scale))
                glyphPath.transform(matrix)
                masterPath.addPath(glyphPath)
                glyphPath.delete()
            }
            currentX += widths[i]
        }

        return masterPath
    }

    override draw(canvas: Canvas): void {
        if (!this.resource || !this.font) return

        const dim = this.getDim()
        const { fill: fillShape, stroke } = this.setTextPaint([0, 0, 1, 1], [0, 0, 1, 1]) // Default blue

        const rect = this.resource.canvasKit.XYWHRect(0, 0, dim.width, dim.height)
        const rrect = this.resource.canvasKit.RRectXY(rect, 3, 3)
        canvas.drawRRect(rrect, fillShape)
        canvas.drawRRect(rrect, stroke)

        const { fill } = this.setTextPaint(this.textStyle.textColor)
        try {
            canvas.drawText(
                this.text,
                this.padding,
                this.padding - this.font.getMetrics().ascent, // baseline adjustment
                fill,
                this.font
            )
        } catch (error) {
            console.error('Error drawing SText:', error)
        }
    }

    override pointInShape(x: number, y: number): boolean {
        const dim = this.getDim()
        return x >= 0 && x <= dim.width && y >= 0 && y <= dim.height
    }

    override cleanUp(): void {
        this.destroy()
    }

    override destroy(): void {
        if (this.font) {
            this.font.delete()
            this.font = null
        }
        if (this.typeface) {
            this.typeface.delete()
            this.typeface = null
        }
    }
}

export default SText
