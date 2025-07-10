import { Shape } from "@/lib/shapes";
import { Canvas, CanvasKit, Paint, ParagraphStyle, TextStyle } from "canvaskit-wasm";

class PText extends Shape {
    private text: string = "";
    private textColor: string | number[]
    private fontSize: number = 16;
    private fontWeight: number = 500;
    private width: number;
    private height: number;
    private fontFamily: string[] = ["Inter", "sans-serif"];
    private fontData: ArrayBuffer[] = []; //look for a better way to prevent storing
    private canvasKit: CanvasKit | null = null;
    private textStyle: TextStyle | null = null;
    private paragraphStyle: ParagraphStyle | null = null;
    private textAlign: any | null = null;

    constructor(x: number, y: number, text?: string, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.text = text || "Text";
        this.textColor = [0, 0, 0, 1];

        this.loadInterFont()
        this.calculateBoundingRect();
    }

    private initializeStyles(canvasKit: CanvasKit): void {
        this.canvasKit = canvasKit
        if (!this.canvasKit) return;
        const textColor = (Array.isArray(this.textColor)) ? this.textColor
            : this.canvasKit.parseColorString(this.textColor);
        this.textAlign = this.canvasKit.TextAlign.Left;

        // Create text style
        this.textStyle = new this.canvasKit.TextStyle({
            color: textColor, // Black text
            fontSize: this.fontSize,
            fontFamilies: this.fontFamily,
            fontVariations: [
                { axis: 'wght', value: this.fontWeight },
                { axis: 'opsz', value: this.fontSize }
            ]
        });

        // Create paragraph style
        this.paragraphStyle = new this.canvasKit.ParagraphStyle({
            textStyle: this.textStyle,
            textAlign: this.textAlign,
        });
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
        if (!this.canvasKit || !this.fontData.length) return [];

        const fontNames: string[] = [];

        try {
            // Create a temporary FontMgr to parse font data
            const fontMgr = this.canvasKit.FontMgr.FromData(...this.fontData);

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
        if (!this.canvasKit || !this.textStyle) return;
        const color = (Array.isArray(textColor)) ? textColor
            : this.canvasKit.parseColorString(textColor);

        this.textStyle.color = color
        this.textStyle.fontSize = fontSize;
        this.textStyle.fontFamilies = fontFamily

    }

    getTextStyle(): { textColor: string | number[], fontSize: number, fontFamily: string[] } {
        return { textColor: this.textColor, fontSize: this.fontSize, fontFamily: this.fontFamily }
    }

    private updateParagraphStyle({ textStyle, textAlign }: { textStyle: TextStyle, textAlign: any }): void {
        if (!this.canvasKit || !this.paragraphStyle) return;

        this.paragraphStyle.textStyle = textStyle
        this.paragraphStyle.textAlign = textAlign;

    }

    getParagraphStyle(): { textStyle: TextStyle, textAlign: any } {
        return { textStyle: this.textStyle, textAlign: this.textAlign }
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
        // Approximate text width calculation - could be enhanced with actual paragraph measurement
        this.width = this.text.length * this.fontSize * 0.6;
        this.height = this.fontSize * 1.2; // Add some line height
        this.boundingRect = {
            top: this.y,
            left: this.x,
            right: this.x + this.width,
            bottom: this.y + this.height
        }
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

    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
        try {
            if (!this.textStyle || !this.paragraphStyle) {
                this.initializeStyles(canvasKit);
            }
            const fontMgr = canvasKit.FontMgr.FromData(...this.fontData)
            const builder = canvasKit.ParagraphBuilder.Make(this.paragraphStyle, fontMgr);

            builder.pushStyle(this.textStyle);
            builder.addText(this.text);

            const paragraph = builder.build();

            this.width = paragraph.getMaxWidth();
            this.height = paragraph.getHeight();

            paragraph.layout(this.width || 1000);

            canvas.drawParagraph(paragraph, this.x, this.y);

            paragraph.delete();
            builder.delete();
        } catch (error) {
            console.error('Error drawing PText:', error);
            console.warn('PText: Attempting fallback rendering');
        }
    }

    setText(text: string): void {
        this.text = text;
        this.calculateBoundingRect();
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
        if (this.textStyle) {
            this.textStyle = null;
        }
        if (this.paragraphStyle) {
            this.paragraphStyle = null;
        }
    }
}

export default PText;