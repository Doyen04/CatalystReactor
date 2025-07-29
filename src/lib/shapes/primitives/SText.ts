import Shape from "../base/Shape";
import { Canvas, Font } from "canvaskit-wasm";
import { Properties, Size } from "@lib/types/shapes";
import Handle from "@lib/modifiers/Handles";

interface SimpleTextStyle {
    textColor: number[]
    fontSize: number;
    fontFamily: string[];
}

class SText extends Shape {
    private text: string = "";
    private textStyle: SimpleTextStyle;
    private dimension: Size;
    private font: Font;

    constructor(x: number, y: number, text?: string, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.style = { fill: "#0000ff", strokeColor: "#0000ff", strokeWidth: 0 }
        this.text = text || "";
        this.dimension = { width: 0, height: 0 };
        this.textStyle = {
            textColor: [0, 0, 0, 1],
            fontSize: 12,
            fontFamily: ["Inter", "sans-serif"],
        };
        const typeface = this.resource.canvasKit.Typeface.GetDefault()
        this.font = new this.resource.canvasKit.Font(typeface, this.textStyle.fontSize);

        this.calculateBoundingRect();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override moveShape(mx: number, my: number): void {
    }

    override setDim(width: number, height: number): void {
        this.dimension.width = width;
        this.dimension.height = height;
        this.calculateBoundingRect();
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;
        this.calculateBoundingRect();
    }

    setText(text: string): void {
        this.text = text;
        this.calculateBoundingRect();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {

    }

    setFontSize(size: number): void {
        this.textStyle.fontSize = size;
        this.calculateBoundingRect();
    }

    setFontFamily(fontFamily: string): void {
        this.textStyle.fontFamily.unshift(fontFamily);
        this.calculateBoundingRect();
    }

    setProperties(prop: Properties): void {
        this.transform = prop.transform;
        this.dimension = prop.size;
        this.style = prop.style;
    }

    getText(): string {
        return this.text;
    }

    override getDim(): { width: number; height: number } {
        return { width: this.dimension.width, height: this.dimension.height };
    }

    override getProperties(): Properties {
        return { transform: this.transform, size: this.dimension, style: this.style };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        return []
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override getModifierHandlesPos(handle: Handle): { x: number; y: number; } {
        return { x: 0, y: 0 }
    }

    calculateBoundingRect(): void {
        // Simple estimation: width = fontSize * text.length * 0.6, height = fontSize
        const width = this.textStyle.fontSize * this.text.length * 0.6;
        const height = this.textStyle.fontSize;
        this.dimension.width = width;
        this.dimension.height = height;
        this.boundingRect = {
            left: this.transform.x,
            top: this.transform.y,
            right: this.transform.x + width,
            bottom: this.transform.y + height,
        };
    }

    draw(canvas: Canvas): void {
        if (!this.resource) {
            console.log('No CanvasKit resources');
            return;
        }
        try {
            canvas.drawText(
                this.text,
                this.transform.x,
                this.transform.y + this.textStyle.fontSize, // baseline
                this.resource.paint,
                this.font
            );
        } catch (error) {
            console.error('Error drawing SText:', error);
        }
    }

    pointInShape(x: number, y: number): boolean {
        return (
            x >= this.transform.x &&
            x <= this.transform.x + this.dimension.width &&
            y >= this.transform.y &&
            y <= this.transform.y + this.dimension.height
        );
    }

    override cleanUp(): void {
        // No cursor or paragraph to clean up
    }

    override destroy(): void {
        // No builder or paragraph to delete
    }
}

export default SText;