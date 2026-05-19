import Shape from '../base/Shape'
import TextCursor from '../base/TextCursor'
import { Canvas, Paint, Paragraph, ParagraphBuilder, ParagraphStyle, TextStyle } from 'canvaskit-wasm'
import { Coord, Properties, PTextStyle, Size } from '@lib/types/shapes'
import { ShapeData } from '@lib/core/EngineStateStore'

class PText extends Shape {
    private TWidth: number = 0
    private THeight: number = 0
    private cursor: TextCursor
    private builder: ParagraphBuilder | null = null
    private paragraph: Paragraph | null = null
    private selectionStart: number = 0
    private selectionEnd: number = 0
    private isEdit: boolean = true

    constructor(data: ShapeData) {
        super(data)
        this.cursor = new TextCursor(this.data.properties.transform.x, this.data.properties.transform.y, 0)
        
        if (!this.data.properties.text) {
            this.data.properties.text = ''
        }
        
        if (!this.data.properties.textStyle) {
            this.data.properties.textStyle = {
                textFill: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
                textAlign: 'left',
                fontSize: 18,
                fontWeight: 500,
                fontFamilies: ['Antonio', 'sans-serif'],
                lineHeight: 1.2,
                backgroundColor: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
            }
        }

        this.setUpBuilder()
        this.setUpParagraph()
        this.calculateTextDim()
        this.startEditing()
    }

    get text(): string {
        return this.data.properties.text || ''
    }

    set text(val: string) {
        this.data.properties.text = val
    }

    get textStyle(): PTextStyle {
        return this.data.properties.textStyle!
    }

    diableEditing() {
        this.isEdit = false
        this.cursor.stopCursorBlink()
    }

    override startEditing() {
        this.isEdit = true
        this.cursor.startCursorBlink()
    }

    override canEdit(): boolean {
        return this.isEdit
    }

    getText(): string {
        return this.text
    }

    override getCenterCoord(): Coord {
        const { width, height } = this.getDim()
        return {
            x: width / 2,
            y: height / 2,
        }
    }

    override getDim(): { width: number; height: number } {
        const { width, height } = this.data.properties.size
        return {
            width: width > 0 ? width : this.TWidth,
            height: height > 0 ? height : this.THeight,
        }
    }

    override setFontSize(size: number): void {
        this.textStyle.fontSize = size
        this.setUpParagraph()
        this.calculateTextDim()
    }

    override setFontFamily(fontFamily: string): void {
        this.textStyle.fontFamilies.unshift(fontFamily)
        this.setUpParagraph()
        this.calculateTextDim()
    }

    override setDim(width: number, height: number): void {
        this.data.properties.size.width = width
        this.data.properties.size.height = height

        this.setUpParagraph()
        this.calculateTextDim()
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    override setCoord(x: number, y: number): void {
        this.data.properties.transform.x = x
        this.data.properties.transform.y = y
        this.cursor.setCoord(x, y)
    }

    private getParagraphStyle(): ParagraphStyle {
        const canvasKit = this.resource.canvasKit
        if (!canvasKit) throw new Error("CanvasKit not loaded")

        const textAlignMap = {
            left: canvasKit.TextAlign.Left,
            right: canvasKit.TextAlign.Right,
            center: canvasKit.TextAlign.Center,
            justify: canvasKit.TextAlign.Justify,
        }

        this.resource.textStyle.color = [0, 0, 0, 1] 
        this.resource.textStyle.fontSize = 12
        this.resource.textStyle.fontFamilies = ['Antonio', 'sans-serif']
        this.resource.textStyle.backgroundColor = [0, 0, 0, 0]
        this.resource.textStyle.fontVariations = [
            { axis: 'wght', value: 400 },
            { axis: 'opsz', value: 12 },
        ]

        this.resource.paragraphStyle.textStyle = this.resource.textStyle
        this.resource.paragraphStyle.textAlign = textAlignMap[this.textStyle.textAlign as keyof typeof textAlignMap] || textAlignMap.left

        return this.resource.paragraphStyle
    }

    private getTextStyleFromSpan(textStyle: PTextStyle): { stroke: Paint; fill: Paint, backgroundColor: Paint, backgroundStroke: Paint, textStyle: TextStyle } {
        const dim = this.getDim()
        const fill = this.paintManager.makeNewPaint(textStyle.textFill, dim)
        const stroke = this.paintManager.makeNewPaint(textStyle.textStroke, dim, true)
        const backgroundFill = this.paintManager.makeNewPaint(textStyle.backgroundColor, dim)
        const backgroundStroke = this.paintManager.makeNewPaint(textStyle.backgroundStroke, dim, true)

        this.resource.textStyle.fontSize = textStyle.fontSize
        this.resource.textStyle.fontFamilies = textStyle.fontFamilies
        this.resource.textStyle.fontVariations = textStyle.fontVariations

        return { fill, stroke, backgroundColor: backgroundFill, backgroundStroke, textStyle: this.resource.textStyle }
    }

    override moveShape(mx: number, my: number): void {
        super.moveShape(mx, my)
        this.cursor.setCoord(this.data.properties.transform.x, this.data.properties.transform.y)
    }

    override pointInShape(x: number, y: number): boolean {
        const dim = this.getDim()
        return x >= 0 && x <= dim.width && y >= 0 && y <= dim.height
    }

    override draw(canvas: Canvas): void {
        if (!this.resource || !this.paragraph) return

        try {
            canvas.drawParagraph(this.paragraph, 0, 0)
            if (this.isEdit) {
                this.cursor.draw(canvas)
            }
        } catch (error) {
            console.error('Error drawing PText:', error)
        }
    }

    override setCursorPosFromCoord(x: number, y: number) {
        this.clearSelection()
        this.cursor.setCursorPositionFromCoord(this.paragraph, this.text, this.textStyle.fontSize, this.textStyle.lineHeight, x, y)
        this.setUpParagraph()
    }

    private deleteSelection(): void {
        const start = Math.min(this.selectionStart, this.selectionEnd)
        const end = Math.max(this.selectionStart, this.selectionEnd)
        const before = this.text.substring(0, start)
        const after = this.text.substring(end)
        this.text = before + after
        this.cursor.setCursorPos(start)
        this.clearSelection()
    }

    override selectAll() {
        this.selectionStart = 0
        this.selectionEnd = this.text.length
        this.cursor.setCursorPos(this.text.length)
        this.setUpParagraph()
    }

    override insertText(char: string, _shiftKey?: boolean): void {
        if (this.hasSelection) {
            this.deleteSelection()
        }
        const textBefore = this.text.slice(0, this.cursor.cursorPosIndex)
        const textAfter = this.text.slice(this.cursor.cursorPosIndex)
        this.text = textBefore + char + textAfter

        this.setUpParagraph()
        this.calculateTextDim()
        this.cursor.updateCursorPosIndex(char.length)
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    override deleteText(direction: 'forward' | 'backward'): void {
        if (this.hasSelection) {
            this.deleteSelection()
        }
        else if (direction === 'backward' && this.cursor.cursorPosIndex > 0) {
            this.text = this.text.slice(0, this.cursor.cursorPosIndex - 1) + this.text.slice(this.cursor.cursorPosIndex)
            this.cursor.updateCursorPosIndex(-1)
        } else if (direction === 'forward' && this.cursor.cursorPosIndex < this.text.length) {
            this.text = this.text.slice(0, this.cursor.cursorPosIndex) + this.text.slice(this.cursor.cursorPosIndex + 1)
        }

        this.setUpParagraph()
        this.calculateTextDim()
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    copyText() {
        const start = Math.min(this.selectionStart, this.selectionEnd)
        const end = Math.max(this.selectionStart, this.selectionEnd)
        const textToCopy = this.text.substring(start, end)
        navigator.clipboard.writeText(textToCopy)
    }

    pasteText() {
        navigator.clipboard.readText().then(string => {
            this.insertText(string, false)
        })
    }

    private setUpBuilder() {
        if (!this.resource || this.resource.fontData.length == 0) return
        const paragraphStyle = this.getParagraphStyle()
        this.builder = this.resource.canvasKit.ParagraphBuilder.Make(paragraphStyle, this.resource.fontMgr)
    }

    private setUpParagraph() {
        if (!this.builder || !this.resource) return

        this.builder.reset()

        if (!this.hasSelection) {
            const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
            backgroundColor.setColor(this.resource.canvasKit.TRANSPARENT)

            this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
            this.builder.addText(this.text)
            this.builder.pop()
        } else {
            const start = Math.min(this.selectionStart, this.selectionEnd)
            const end = Math.max(this.selectionStart, this.selectionEnd)
            
            if (start > 0) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
                backgroundColor.setColor(this.resource.canvasKit.TRANSPARENT)
                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(0, start))
                this.builder.pop()
            }
            if (start < end) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
                backgroundColor.setColor(this.resource.canvasKit.Color(0, 0, 255))
                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(start, end))
                this.builder.pop()
            }
            if (end < this.text.length) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
                backgroundColor.setColor(this.resource.canvasKit.TRANSPARENT)
                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(end))
                this.builder.pop()
            }
        }

        this.paragraph = this.builder.build()
        const layoutWidth = this.data.properties.size.width > 0 ? this.data.properties.size.width : 1000
        this.paragraph.layout(layoutWidth)
    }

    private calculateTextDim() {
        if (!this.paragraph) return
        this.TWidth = this.paragraph.getLongestLine()
        this.THeight = this.paragraph.getHeight()
    }

    private get hasSelection(): boolean {
        return this.selectionStart !== this.selectionEnd
    }

    private clearSelection(): void {
        this.selectionStart = 0
        this.selectionEnd = 0
    }

    override moveCursor(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean) {
        if (shiftKey) {
            if (!this.hasSelection) this.selectionStart = this.cursor.cursorPosIndex
        } else {
            this.clearSelection()
        }
        this.cursor.moveCursor(direction, this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)

        if (shiftKey) this.selectionEnd = this.cursor.cursorPosIndex
        this.setUpParagraph()
    }

    override cleanUp(): void {
        this.cursor.stopCursorBlink()
        this.diableEditing()
    }

    override destroy(): void {
        this.cursor.stopCursorBlink()
        if (this.builder) this.builder.delete()
        if (this.paragraph) this.paragraph.delete()
    }
}

export default PText
