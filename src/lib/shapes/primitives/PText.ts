import { Shape, TextCursor } from "@/lib/shapes";
import { Canvas, Color, FontMgr, Paragraph, ParagraphBuilder, ParagraphStyle, TextStyle } from "canvaskit-wasm";

interface TextStyleProp {
    textColor: string | number[];
    fontSize: number;
    fontWeight: number;
    fontFamily: string[];
    lineHeight: number;
    textAlign: any | null;
    textSpacing?: number;
    backgroundColor?: Color | null;
}

class PText extends Shape {
    private text: string = "";
    private textStyle: TextStyleProp;
    private width: number = 0;
    private height: number = 0;
    private TWidth: number = 0;
    private THeight: number = 0;
    private cursor: TextCursor;
    private fontMgr: FontMgr;
    private builder: ParagraphBuilder;
    private paragraph: Paragraph | null;
    private selectionStart: number = 0;
    private selectionEnd: number = 0;

    constructor(x: number, y: number, text?: string, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.text = text || "";

        this.cursor = new TextCursor(x, y, 0)

        this.paragraph = null
        this.fontMgr = null
        this.builder = null
        this.setTextStyle()
        this.setUpBuilder()
        this.insertText(this.text, false)
        this.calculateBoundingRect();

    }
    private setTextStyle() {
        if (!this.resource) {
            console.log('no canvas kit resources');

        }
        this.textStyle = {
            textColor: [0, 0, 0, 1],
            textAlign: this.resource.canvasKit.TextAlign.Left,
            fontSize: 16,
            fontWeight: 500,
            fontFamily: ["Inter", "sans-serif"],
            lineHeight: 1.2,
            backgroundColor: this.resource.canvasKit.TRANSPARENT
        }
    }

    private setStyles(textStyle: TextStyleProp): [TextStyle, ParagraphStyle] {
        const canvasKit = this.resource.canvasKit

        if (!canvasKit) return;

        const textColor = (Array.isArray(textStyle.textColor)) ? textStyle.textColor
            : canvasKit.parseColorString(textStyle.textColor);

        this.textStyle.textAlign = canvasKit.TextAlign.Left;
        // Create text style
        this.resource.textStyle.color = textColor // Black text
        this.resource.textStyle.fontSize = textStyle.fontSize
        this.resource.textStyle.fontFamilies = textStyle.fontFamily
        this.resource.textStyle.backgroundColor = textStyle.backgroundColor
        this.resource.textStyle.fontVariations = [
            { axis: 'wght', value: textStyle.fontWeight },
            { axis: 'opsz', value: textStyle.fontSize }
        ]

        // Create paragraph style
        this.resource.paragraphStyle.textStyle = this.resource.textStyle
        this.resource.paragraphStyle.textAlign = canvasKit.TextAlign.Left

        return [this.resource.textStyle, this.resource.paragraphStyle]
    }

    private extractFontNames(): string[] {
        if (!this.resource.canvasKit || !this.resource.fontData.length) return [];

        const fontNames: string[] = [];

        try {
            // Create a temporary FontMgr to parse font data
            const fontMgr = this.resource.fontMgr.FromData(...this.resource.fontData);

            // Get the number of font families
            const familyCount = fontMgr.countFamilies();

            for (let i = 0; i < familyCount; i++) {
                const familyName = fontMgr.getFamilyName(i);
                if (familyName) {
                    fontNames.push(familyName);
                    console.log(`Font family ${i}: ${familyName}`);
                }
            }
        }
        catch (error) {
            console.error('Error extracting font names:', error);
        }

        return fontNames;
    }

    get getTextStyle(): TextStyleProp {
        return { ...this.textStyle }
    }

    updateStyles() {
        this.setStyles(this.textStyle)
    }

    pointInShape(x: number, y: number): boolean {
        const w = (this.width == 0) ? this.TWidth : this.width
        const h = (this.height == 0) ? this.THeight : this.height
        return x >= this.x && x <= this.x + w && y >= this.y && y <= this.y + h;
    }

    calculateBoundingRect(): void {

        this.boundingRect = {
            left: this.x,
            top: this.y,
            right: this.x + ((this.width > 0) ? this.width : this.TWidth),
            bottom: this.y + ((this.height > 0) ? this.height : this.THeight),
        };
    }

    moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
        this.cursor.setCoord(this.x, this.y)

        this.calculateBoundingRect()
    }

    setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // For text, we might adjust font size instead of traditional sizing
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.width = Math.abs(deltaX);
        this.height = Math.abs(deltaY);
        this.x = Math.min(dragStart.x, mx);
        this.y = Math.min(dragStart.y, my);
        this.calculateBoundingRect();
    }

    draw(canvas: Canvas): void {
        if (!this.resource || !this.paragraph) {
            console.log('failed to draw');
            return
        }

        try {
            canvas.drawParagraph(this.paragraph, this.x, this.y);
            this.cursor.draw(canvas)

        } catch (error) {
            console.error('Error drawing PText:', error);
            console.warn('PText: Attempting fallback rendering');
        }
    }
    private deleteSelection(): void {
        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);
        const before = this.text.substring(0, start);
        const after = this.text.substring(end);
        this.text = before + after;
        this.cursor.setCursorPos(start);
        this.clearSelection();

    }

    insertText(char: string, shiftKey: boolean): void {
        if (this.hasSelection) {
            this.deleteSelection()
        }
        const textBefore = this.text.slice(0, this.cursor.cursorPosIndex)
        const textAfter = this.text.slice(this.cursor.cursorPosIndex);
        this.text = textBefore + char + textAfter
        this.cursor.updateCursorPosIndex(char.length);

        this.setUpParagraph()
        this.calculateDim()
        this.calculateBoundingRect();
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }

    deleteText(direction: 'forward' | 'backward'): void {
        if (direction === 'backward' && this.cursor.cursorPosIndex > 0) {
            this.text = this.text.slice(0, this.cursor.cursorPosIndex - 1) + this.text.slice(this.cursor.cursorPosIndex);
            this.cursor.updateCursorPosIndex(-1);
        } else if (direction === 'forward' && this.cursor.cursorPosIndex < this.text.length) {
            this.text = this.text.slice(0, this.cursor.cursorPosIndex) + this.text.slice(this.cursor.cursorPosIndex + 1);
        }

        this.setUpParagraph()
        this.calculateDim()
        this.calculateBoundingRect();
        this.cursor.calculateCursorCoord(this.text, this.textStyle.fontSize, this.textStyle.lineHeight, this.paragraph)
    }
    copyText() {
        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);
        const text = this.text.substring(start, end);
        navigator.clipboard.writeText(text)

    }
    pasteText() {
        navigator.clipboard.readText().then((string) => {
            this.insertText(string, false);
        })
        // is there any eveny like onpaste
    }

    setUpBuilder() {
        if (this.resource.fontData.length == 0) {
            console.log(this.resource.fontData);

            return
        }
        const fontData = this.resource.fontData

        const [textStyle, paragraphStyle] = this.setStyles(this.textStyle);

        this.fontMgr = this.resource.fontMgr.FromData(...fontData)
        console.log(this.fontMgr, fontData);

        this.builder = this.resource.canvasKit.ParagraphBuilder.Make(paragraphStyle, this.fontMgr);

    }

    setUpParagraph() {
        if (!this.builder || !this.resource) {
            console.log('no resources amd builder');
            return
        }
        const [textStyle, paragraphStyle] = this.setStyles(this.textStyle);

        this.builder.reset()

        if (!this.hasSelection) {
            this.builder.pushStyle(textStyle);
            this.builder.addText(this.text);
            this.builder.pop()
        } else {
            const start = Math.min(this.selectionStart, this.selectionEnd)
            const end = Math.max(this.selectionStart, this.selectionEnd)
            if (start > 0) {
                this.builder.pushStyle(textStyle);
                this.builder.addText(this.text.substring(0, start));
                this.builder.pop();
            } if (start < end) {
                const selectionStyle = this.getTextStyle
                selectionStyle.backgroundColor = this.resource.canvasKit.Color(0, 0, 255)

                const [textStyle, paragraphStyle] = this.setStyles(selectionStyle);

                this.builder.pushStyle(textStyle);
                this.builder.addText(this.text.substring(start, end));
                this.builder.pop();

            } if (end < this.text.length) {
                const [textStyle, paragraphStyle] = this.setStyles(this.textStyle);
                this.builder.pushStyle(textStyle);
                this.builder.addText(this.text.substring(end));
                this.builder.pop();
            }
        }

        this.paragraph = this.builder.build();

        this.paragraph.layout(((this.width > 0) ? this.width : 1000));
    }

    calculateDim() {
        if (!this.paragraph) return

        const width = this.paragraph.getLongestLine();
        const height = this.paragraph.getHeight();

        this.TWidth = width
        this.THeight = height
    }

    private get hasSelection(): boolean {
        return this.selectionStart !== this.selectionEnd;
    }

    private clearSelection(): void {
        this.selectionStart = 0;
        this.selectionEnd = 0;
    }

    moveCursor(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean) {
        if (shiftKey) {
            if (!this.hasSelection) this.selectionStart = this.cursor.cursorPosIndex
        } else {
            this.clearSelection()
        }
        this.cursor.moveCursor(direction,
            this.text, this.textStyle.fontSize,
            this.textStyle.lineHeight, this.paragraph)

        //remember moving cursor up and down does not work if text wraps
        if (shiftKey) this.selectionEnd = this.cursor.cursorPosIndex

    }

    getText(): string {
        return this.text;
    }

    setFontSize(size: number): void {
        this.textStyle.fontSize = size;

        this.updateStyles();
        this.calculateBoundingRect();
    }

    setFontFamily(fontFamily: string): void {
        this.textStyle.fontFamily.unshift(fontFamily);

        this.updateStyles();
        this.calculateBoundingRect();
    }

    override setDim(width: number, height: number): void {

    }

    override setCoord(x: number, y: number): void {

    }

    override destroy(): void {
        this.cursor.destroy()
        if (this.builder) {
            this.builder.delete()
        }
        if (this.fontMgr) {
            this.fontMgr.delete()
        }
        // if(this.paragraph){
        //     this.paragraph.delete()
        // }// not sure if i should delete
        //add more from this class
    }
}

export default PText;