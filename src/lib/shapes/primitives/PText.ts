import Shape from '../base/Shape'
import TextCursor from '../base/TextCursor'
import { Canvas, Paint, Paragraph, ParagraphBuilder, ParagraphStyle, TextStyle } from 'canvaskit-wasm'
import Handle from '@lib/modifiers/Handles'
import { Coord, Properties, PTextStyle, Size } from '@lib/types/shapes'

//TODO:optimise this guy  make sure resources is done in canvaskitresources and all font is loaded there then use style to target it

class PText extends Shape {
    private text: string = ''
    private textStyle: PTextStyle
    private dimension: Size
    private TWidth: number = 0
    private THeight: number = 0
    private cursor: TextCursor
    private builder: ParagraphBuilder
    private paragraph: Paragraph | null
    private selectionStart: number = 0
    private selectionEnd: number = 0
    private isEdit: boolean = true

    constructor(x: number, y: number, text?: string, { ...shapeProps } = {}) {
        super({ x, y, type: 'text', ...shapeProps })
        this.text = text || ''
        this.dimension = { width: 0, height: 0 }
        this.cursor = new TextCursor(x, y, 0)

        this.paragraph = null
        this.builder = null
        this.setTextStyle()
        this.setUpBuilder()
        this.insertText(this.text, false)
        this.calculateBoundingRect()
    }
    diableEditing() {
        this.isEdit = false
        this.cursor.stopCursorBlink()
    }
    startEditing() {
        this.isEdit = true
        this.cursor.startCursorBlink()
    }
    canEdit(): boolean {
        return this.isEdit
    }

    getText(): string {
        return this.text
    }

    override getCenterCoord(): Coord {
        return {
            x: (this.dimension.width > 0 ? this.dimension.width : this.TWidth) / 2,
            y: (this.dimension.height > 0 ? this.dimension.height : this.THeight) / 2,
        }
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number } {
        if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle)
        } else if (handle.type == 'angle') {
            return super.getAngleModifierHandlesPos(handle)
        }
        return { x: 0, y: 0 }
    }

    override getModifierHandles(): Handle[] {
        const handles = super.getSizeModifierHandles()
        super.getAngleModifierHandles().forEach(handle => {
            handles.push(handle)
        })
        return handles
    }

    override getDim(): { width: number; height: number } {
        return {
            width: this.dimension.width > 0 ? this.dimension.width : this.TWidth,
            height: this.dimension.height > 0 ? this.dimension.height : this.THeight,
        }
    }
    getProperties(): Properties {
        return {
            transform: this.transform,
            size: this.dimension,
            style: this.style,
            textStyle: this.textStyle,
        }
    }
    setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.dimension = prop.size
        this.style = prop.style
        this.textStyle = prop.textStyle

        this.setUpParagraph()
        this.calculateTextDim()
        this.calculateBoundingRect()
        this.cursor.setCoord(this.transform.x, this.transform.y)
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }
    setFontSize(size: number): void {
        this.textStyle.fontSize = size

        //work on this
        this.calculateBoundingRect() //i tink it is not comp
    }

    setFontFamily(fontFamily: string): void {
        this.textStyle.fontFamilies.unshift(fontFamily)

        //work on this
        this.calculateBoundingRect() //i tink it is not comp
    }

    override setDim(width: number, height: number): void {
        this.dimension.width = width
        this.dimension.height = height

        this.setUpParagraph()
        this.calculateTextDim()
        this.calculateBoundingRect()
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x
        this.transform.y = y
        this.cursor.setCoord(x, y)
        this.calculateBoundingRect()
    }

    private setTextStyle() {
        if (!this.resource) {
            console.log('no canvas kit resources')
        }
        this.textStyle = {
            textFill: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
            textAlign: 'left',
            fontSize: 18,
            fontWeight: 500,
            fontFamilies: ['Antonio', 'sans-serif'],
            lineHeight: 1.2,
            backgroundColor: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
        }
    }

    private getParagraphStyle(): ParagraphStyle {
        const canvasKit = this.resource.canvasKit

        if (!canvasKit) return

        const textAlign = {
            left: canvasKit.TextAlign.Left,
            right: canvasKit.TextAlign.Right,
            center: canvasKit.TextAlign.Center,
            justify: canvasKit.TextAlign.Justify,
        }
        // Create text style
        this.resource.textStyle.color = [0, 0, 0, 1] // Black text
        this.resource.textStyle.fontSize = 12
        this.resource.textStyle.fontFamilies = ['Antonio', 'sans-serif']
        this.resource.textStyle.backgroundColor = [0, 0, 0, 0]
        this.resource.textStyle.fontVariations = [
            { axis: 'wght', value: 400 },
            { axis: 'opsz', value: 12 },
        ]

        // Create paragraph style
        this.resource.paragraphStyle.textStyle = this.resource.textStyle
        this.resource.paragraphStyle.textAlign = textAlign.left //replace this

        return this.resource.paragraphStyle
    }

    private getTextStyleFromSpan(textStyle: PTextStyle): { stroke: Paint; fill: Paint, backgroundColor: Paint, backgroundStroke: Paint, textStyle: TextStyle } {
        const canvasKit = this.resource.canvasKit
        if (!canvasKit) return

        const fill = this.paintManager.makeNewPaint(textStyle.textFill, this.getDim())
        const stroke = this.paintManager.makeNewPaint(textStyle.textStroke, this.getDim(), true)
        const backgroundFill = this.paintManager.makeNewPaint(textStyle.backgroundColor, this.getDim())
        const backgroundStroke = this.paintManager.makeNewPaint(textStyle.backgroundStroke, this.getDim(), true)

        this.resource.textStyle.fontSize = textStyle.fontSize
        this.resource.textStyle.fontFamilies = textStyle.fontFamilies
        this.resource.textStyle.fontVariations = textStyle.fontVariations

        return { fill: fill, stroke: stroke, backgroundColor: backgroundFill, backgroundStroke: backgroundStroke, textStyle: this.resource.textStyle }
    }

    override moveShape(mx: number, my: number): void {
        this.transform.x += mx
        this.transform.y += my
        this.cursor.setCoord(this.transform.x, this.transform.y)

        this.calculateBoundingRect()
    }

    pointInShape(x: number, y: number): boolean {
        const w = this.dimension.width == 0 ? this.TWidth : this.dimension.width
        const h = this.dimension.height == 0 ? this.THeight : this.dimension.height
        return x >= 0 && x <= w && y >= 0 && y <= h
    }

    calculateBoundingRect(): void {
        this.boundingRect = {
            left: 0,
            top: 0,
            right: this.dimension.width > 0 ? this.dimension.width : this.TWidth,
            bottom: this.dimension.height > 0 ? this.dimension.height : this.THeight,
        }
    }

    draw(canvas: Canvas): void {
        if (!this.resource || !this.paragraph) {
            console.log('failed to draw')
            return
        }

        try {
            canvas.drawParagraph(this.paragraph, 0, 0)
            this.cursor.draw(canvas)
        } catch (error) {
            console.error('Error drawing PText:', error)
            console.warn('PText: Attempting fallback rendering')
        }
    }

    setCursorPosFromCoord(x: number, y: number) {
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

    selectAll() {
        this.selectionStart = 0
        this.selectionEnd = this.text.length
        this.cursor.setCursorPos(this.text.length)
        this.setUpParagraph()
    }

    insertText(char: string, shiftKey?: boolean): void {
        if (this.hasSelection) {
            this.deleteSelection()
        }
        const textBefore = this.text.slice(0, this.cursor.cursorPosIndex)
        const textAfter = this.text.slice(this.cursor.cursorPosIndex)
        this.text = textBefore + char + textAfter

        this.setUpParagraph()
        this.calculateTextDim()
        this.calculateBoundingRect()
        this.cursor.updateCursorPosIndex(char.length)
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    deleteText(direction: 'forward' | 'backward'): void {
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
        this.calculateBoundingRect()
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    copyText() {
        const start = Math.min(this.selectionStart, this.selectionEnd)
        const end = Math.max(this.selectionStart, this.selectionEnd)
        const text = this.text.substring(start, end)
        navigator.clipboard.writeText(text)
    }

    pasteText() {
        navigator.clipboard.readText().then(string => {
            this.insertText(string, false)
        })
        // is there any eveny like onpaste
    }

    setUpBuilder() {
        if (this.resource.fontData.length == 0) {
            console.log(this.resource.fontData)

            return
        }
        const paragraphStyle = this.getParagraphStyle()
        this.builder = this.resource.canvasKit.ParagraphBuilder.Make(paragraphStyle, this.resource.fontMgr)
    }

    setUpParagraph() {
        if (!this.builder || !this.resource) {
            console.log('no resources amd builder')
            return
        }

        this.builder.reset()

        if (!this.hasSelection) {

            const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
            const background = this.resource.canvasKit.TRANSPARENT
            backgroundColor.setColor(background)// fix this later

            this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
            this.builder.addText(this.text)
            this.builder.pop()
        } else {
            const start = Math.min(this.selectionStart, this.selectionEnd)
            const end = Math.max(this.selectionStart, this.selectionEnd)
            if (start > 0) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
                const background = this.resource.canvasKit.TRANSPARENT
                backgroundColor.setColor(background)// fix this later

                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(0, start))
                this.builder.pop()
            }
            if (start < end) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)

                const background = this.resource.canvasKit.Color(0, 0, 255)
                backgroundColor.setColor(background)// fix this later

                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(start, end))
                this.builder.pop()
            }
            if (end < this.text.length) {
                const { textStyle, fill, backgroundColor } = this.getTextStyleFromSpan(this.textStyle)
                const background = this.resource.canvasKit.TRANSPARENT
                backgroundColor.setColor(background)// fix this later

                this.builder.pushPaintStyle(textStyle, fill, backgroundColor)
                this.builder.addText(this.text.substring(end))
                this.builder.pop()
            }
        }

        this.paragraph = this.builder.build()

        this.paragraph.layout(this.dimension.width > 0 ? this.dimension.width : 1000)
    }

    calculateTextDim() {
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

    moveCursor(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean) {
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
        console.log('CLEANUP');

        this.cursor.stopCursorBlink()
        this.diableEditing()
    }
    override destroy(): void {
        this.cursor.stopCursorBlink()
        if (this.builder) {
            this.builder.delete()
        }
        if (this.paragraph) {
            this.paragraph.delete()
        } // not sure if i should delete
        //add more from this class
    }
}

export default PText
