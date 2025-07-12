// TextCursor.ts
import { CanvasKitResources } from "@lib/core";
import type { Canvas, Paragraph } from "canvaskit-wasm";

class TextCursor {
    private x: number;
    private y: number;
    private textX: number;
    private textY: number;
    private height: number;
    private visible: boolean = true;
    private blinkInterval: ReturnType<typeof setTimeout>;
    private blinkSpeed: number = 500; // ms
    private cursorIndex: number;

    constructor(initialX: number, initialY: number, initialHeight: number) {
        this.x = initialX;
        this.y = initialY;
        this.textX = 0
        this.textY = 0
        this.height = initialHeight;
        this.cursorIndex = 0

        // Setup blinking effect
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible
        }, this.blinkSpeed)
    }
    updateCursorPosIndex(di: number) {
        this.cursorIndex += di
    }
    setCursorPos(pos: number) {
        this.cursorIndex = pos
    }
    get cursorPosIndex(): number {
        return this.cursorIndex
    }
    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }
    setXY(x: number, y: number) {
        this.x = x
        this.y = y
    }

    setPaint() {
        if (!this.resource) {
            console.log('resource not set');

            return
        }

        this.resource.strokePaint.setColor(this.resource.canvasKit.BLACK);
        this.resource.strokePaint.setStrokeWidth(2)
    }

    calculateCursorCoord(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph) {
        const cursorPos = this.calculateCursorRect(text, fontSize, lineHeight, paragraph);

        if (cursorPos.length == 0) return
        this.updatePosition(cursorPos[0], cursorPos[1], cursorPos[3]);
    }

    private calculateCursorRect(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): number[] {
        if (!this.resource.canvasKit) return [];

        if (this.cursorIndex == 0) {
            return [0, 0, 2, fontSize * lineHeight];
        }
        if (text[this.cursorIndex - 1] === "\n") {
            // Fallback for newline
            console.log(text.split('\n'), text);

            const lineCount = text.slice(0, this.cursorIndex).split("\n").length - 1;
            const yOffset = lineCount * fontSize * lineHeight;
            return [0, yOffset, 2, fontSize * lineHeight];
        }

        const rects = paragraph.getRectsForRange(
            Math.max(0, this.cursorIndex - 1),
            this.cursorIndex,
            this.resource.canvasKit.RectHeightStyle.IncludeLineSpacingTop,
            this.resource.canvasKit.RectWidthStyle.Tight
        );
        console.log(rects, this.cursorIndex, this.x);

        if (!rects.length) return [];
        let [x, y, w, h] = rects[rects.length - 1].rect;
        h = (h > fontSize * lineHeight) ? fontSize * lineHeight : h

        return [w, y, 2, h];
    }

    moveCursor(direction: 'left' | 'right' | 'up' | 'down', text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): void {
        switch (direction) {
            case 'left':
                this.cursorIndex = Math.max(0, this.cursorIndex - 1);
                break;
            case 'right':
                this.cursorIndex = Math.min(text.length, this.cursorIndex + 1);
                break;
            case 'up':
                this.moveCursorUp(text)
                break;
            case 'down':
                this.moveCursorDown(text)
                break;
            default:
                console.log('direction not implemented');

            // TODO: Implement up/down for multi-line text
        }

        this.calculateCursorCoord(text, fontSize, lineHeight, paragraph)
    }

    private moveCursorUp(text: string): void {
        const lines = text.split('\n');
        const { lineIndex, charIndex } = this.getCursorLinePosition(text);

        if (lineIndex > 0) {
            const targetLine = lines[lineIndex - 1];
            const newCharIndex = Math.min(charIndex, targetLine.length);
            const newPosition = this.getnextCursorPositionFromLine(text, lineIndex - 1, newCharIndex);

            this.cursorIndex = newPosition;
        }
    }

    private moveCursorDown(text: string): void {
        const lines = text.split('\n');
        const { lineIndex, charIndex } = this.getCursorLinePosition(text);

        if (lineIndex < lines.length - 1) {
            const targetLine = lines[lineIndex + 1];
            const newCharIndex = Math.min(charIndex, targetLine.length);
            const newPosition = this.getnextCursorPositionFromLine(text, lineIndex + 1, newCharIndex);

            this.cursorIndex = newPosition;
        }
    }

    private getnextCursorPositionFromLine(text: string, lineIndex: number, charIndex: number): number {
        const lines = text.split('\n');
        let position = 0;

        for (let i = 0; i < lineIndex && i < lines.length; i++) {//check agast this ??
            position += lines[i].length + 1; // +1 for newline
        }

        return position + Math.min(charIndex, lines[lineIndex]?.length || 0);
    }

    private getCursorLinePosition(text: string): { lineIndex: number, charIndex: number } {
        const lines = text.split('\n');
        let currentPos = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length;
            if (currentPos + lineLength >= this.cursorIndex) {
                return {
                    lineIndex: i,
                    charIndex: this.cursorIndex - currentPos
                };
            }
            currentPos += lineLength + 1; // +1 for newline character
        }

        return { lineIndex: lines.length - 1, charIndex: lines[lines.length - 1]?.length || 0 };
    }

    updatePosition(x: number, y: number, height: number): void {
        this.textX = x;
        this.textY = y;
        this.height = height;
        this.visible = true;
        // Reset blink timer
        clearInterval(this.blinkInterval);
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible;
        }, this.blinkSpeed);
    }

    draw(canvas: Canvas): void {
        if (!this.visible || !this.resource) return;
        this.setPaint()

        canvas.drawLine(this.x + this.textX, this.y + this.textY, this.x + this.textX, this.y + this.textY + this.height, this.resource.strokePaint);
    }

    destroy(): void {
        this.visible = false
        clearInterval(this.blinkInterval);
    }
}

export default TextCursor