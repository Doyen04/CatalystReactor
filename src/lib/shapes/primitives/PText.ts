import { Shape, TextCursor } from "@/lib/shapes";
import { Canvas, FontMgr, Paragraph, ParagraphBuilder, ParagraphStyle, TextStyle } from "canvaskit-wasm";

class PText extends Shape {
    private text: string = "";
    private textColor: string | number[]
    private fontSize: number = 16;
    private fontWeight: number = 500;
    private lineHeight: number = 1.2
    private width: number = 0;
    private height: number = 0;
    private fontFamily: string[] = ["Inter", "sans-serif"];
    private fontData: ArrayBuffer[] = []; //look for a better way to prevent storing
    private textAlign: any | null = null;
    private cursor: TextCursor;
    private cursorIndex: number;
    private fontMgr: FontMgr;
    private builder: ParagraphBuilder;
    private paragraph: Paragraph | null;

    constructor(x: number, y: number, text?: string, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.text = text || "";
        this.textColor = [0, 0, 0, 1];
        this.cursorIndex = 0
        this.cursor = new TextCursor(0, 0, 0)

        this.paragraph = null
        this.fontMgr = null
        this.builder = null

        this.loadInterFont()
        this.insertText(this.text)
        this.calculateBoundingRect();
    }

    private setStyles(): [TextStyle, ParagraphStyle] {
        const canvasKit = this.resource.canvasKit

        if (!canvasKit) return;

        const textColor = (Array.isArray(this.textColor)) ? this.textColor
            : canvasKit.parseColorString(this.textColor);

        this.textAlign = canvasKit.TextAlign.Left;

        // Create text style
        this.resource.textStyle.color = textColor // Black text
        this.resource.textStyle.fontSize = this.fontSize
        this.resource.textStyle.fontFamilies = this.fontFamily
        this.resource.textStyle.fontVariations = [
            { axis: 'wght', value: this.fontWeight },
            { axis: 'opsz', value: this.fontSize }
        ]

        // Create paragraph style
        this.resource.paragraphStyle.textStyle = this.resource.textStyle
        this.resource.paragraphStyle.textAlign = this.textAlign

        return [this.resource.textStyle, this.resource.paragraphStyle]
    }

    async loadInterFont() {
        // Load the variable font files in parallel
        const [interNormal, interItalic] = await Promise.all([
            fetch('/fonts/Inter-VariableFont_opsz,wght.ttf'),
            fetch('/fonts/Inter-Italic-VariableFont_opsz,wght.ttf')
        ]);

        if (!interNormal.ok || !interItalic.ok) {
            console.warn('Failed to load some font files');
            return;
        }
        // Convert to array buffers in parallel
        const [normalData, italicData] = await Promise.all([
            interNormal.arrayBuffer(),
            interItalic.arrayBuffer()
        ]);
        if (normalData.byteLength === 0 || italicData.byteLength === 0) {
            console.warn('Font data is empty');
            return;
        }
        this.fontData = [normalData, italicData];
        // Create a new FontMgr instance
    }

    private extractFontNames(): string[] {
        if (!this.resource.canvasKit || !this.fontData.length) return [];

        const fontNames: string[] = [];

        try {
            // Create a temporary FontMgr to parse font data
            const fontMgr = this.resource.fontMgr.FromData(...this.fontData);

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

    private updateTextStyle({ textColor, fontSize, fontFamily }: { textColor: string | number[], fontSize: number, fontFamily: string[] }): void {
        if (!this.resource) return;
        const color = (Array.isArray(textColor)) ? textColor
            : this.resource.canvasKit.parseColorString(textColor);

        this.resource.textStyle.color = color
        this.resource.textStyle.fontSize = fontSize;
        this.resource.textStyle.fontFamilies = fontFamily

    }

    getTextStyle(): { textColor: string | number[], fontSize: number, fontFamily: string[] } {
        return { textColor: this.textColor, fontSize: this.fontSize, fontFamily: this.fontFamily }
    }

    private updateParagraphStyle({ textStyle, textAlign }: { textStyle: TextStyle, textAlign: any }): void {
        if (!this.resource) return;

        this.resource.paragraphStyle.textStyle = textStyle
        this.resource.paragraphStyle.textAlign = textAlign;

    }

    getParagraphStyle(): { textStyle: TextStyle, textAlign: any } {
        const [textStyle, paragraphStyle] = this.setStyles()
        return { textStyle: textStyle, textAlign: this.textAlign }
    }

    updateStyles() {
        this.updateTextStyle(this.getTextStyle())
        this.updateParagraphStyle(this.getParagraphStyle())
    }

    pointInShape(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    calculateBoundingRect(): void {
        if (!this.width || !this.height) {
            console.log('no width and height');

            return
        }
        this.boundingRect = {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height,
        };
    }

    moveShape(mx: number, my: number): void {
        this.x += mx;
        this.y += my;
    }

    setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // For text, we might adjust font size instead of traditional sizing
        const distance = Math.sqrt(Math.pow(mx - dragStart.x, 2) + Math.pow(my - dragStart.y, 2));
        this.fontSize = Math.max(8, Math.min(72, 16 + distance * 0.1));

        this.updateStyles()
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

    insertText(char: string): void {
        const textBefore = this.text.slice(0, this.cursorIndex)
        const textAfter = this.text.slice(this.cursorIndex);
        this.text = textBefore + char + textAfter
        this.cursorIndex += char.length;

        this.setUpBuilder()
        this.calculateCursorPos()
        this.calculateBoundingRect();
    }

    setUpBuilder() {
        const [textStyle, paragraphStyle] = this.setStyles();

        this.fontMgr = this.resource.fontMgr.FromData(...this.fontData)
        this.builder = this.resource.canvasKit.ParagraphBuilder.Make(paragraphStyle, this.fontMgr);

        this.builder.pushStyle(textStyle);
        this.builder.addText(this.text);

        this.paragraph = this.builder.build();

        this.paragraph.layout(1000);

        const width = this.paragraph.getLongestLine();
        const height = this.paragraph.getHeight();
        console.log(width, height);

        this.width = (width <= 0) ? 30 : width
        this.height = (height <= 0) ? (this.fontSize * this.lineHeight) : height
    }

    deleteText(direction: 'forward' | 'backward'): void {
        if (direction === 'backward' && this.cursorIndex > 0) {
            this.text = this.text.slice(0, this.cursorIndex - 1) + this.text.slice(this.cursorIndex);
            this.cursorIndex--;
        } else if (direction === 'forward' && this.cursorIndex < this.text.length) {
            this.text = this.text.slice(0, this.cursorIndex) + this.text.slice(this.cursorIndex + 1);
        }

        this.setUpBuilder()
        this.calculateBoundingRect();
        this.calculateCursorPos()
    }

    private calculateCursorRect(): number[] {
        if (!this.resource.canvasKit) return [];

        const text = this.text
        if (text[this.cursorIndex - 1] === "\n") {
            // Fallback for newline
            const lineCount = text.slice(0, this.cursorIndex).split("\n").length - 1;
            const yOffset = lineCount * this.fontSize * this.lineHeight;
            const caretY = this.y + yOffset;
            return [this.x, caretY, 2, this.fontSize * this.lineHeight];
        }

        const rects = this.paragraph.getRectsForRange(
            Math.max(0, this.cursorIndex - 1),
            this.cursorIndex,
            this.resource.canvasKit.RectHeightStyle.IncludeLineSpacingTop,
            this.resource.canvasKit.RectWidthStyle.Tight
        );
        console.log(rects, this.cursorIndex, this.x);

        if (!rects.length) return [];
        let [x, y, w, h] = rects[rects.length - 1].rect;
        h = (h > this.fontSize * this.lineHeight) ? this.fontSize * this.lineHeight : h

        return [this.x + w, y + this.y, w, h];
    }

    private calculateCursorPos() {
        if (this.cursor) {
            const cursorPos = this.calculateCursorRect();
            this.cursor.updatePosition(cursorPos[0], cursorPos[1], cursorPos[3]);
        }
    }

    moveCursor(direction: 'left' | 'right' | 'up' | 'down'): void {
        switch (direction) {
            case 'left':
                this.cursorIndex = Math.max(0, this.cursorIndex - 1);
                break;
            case 'right':
                this.cursorIndex = Math.min(this.text.length, this.cursorIndex + 1);
                break;
            // TODO: Implement up/down for multi-line text
        }

        this.calculateCursorPos()
    }

    getText(): string {
        return this.text;
    }

    setFontSize(size: number): void {
        this.fontSize = size;

        this.updateStyles();
        this.calculateBoundingRect();
    }

    setFontFamily(fontFamily: string): void {
        this.fontFamily.unshift(fontFamily);

        this.updateStyles();
        this.calculateBoundingRect();
    }

    destroy(): void {

    }
}

export default PText;