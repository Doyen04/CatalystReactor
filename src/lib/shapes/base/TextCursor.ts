// TextCursor.ts
import { CanvasKitResources } from "@lib/core/CanvasKitResource";
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

        this.startCursorBlink()
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
    setCoord(x: number, y: number) {
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

    private findLineAfterNewline(lineMetrics: any[]): number {
        // Find the line that starts at or after the cursor position
        for (let i = 0; i < lineMetrics.length; i++) {
            const metric = lineMetrics[i];
            if (this.cursorIndex <= metric.startIndex) {
                return i;
            }
            if (this.cursorIndex >= metric.startIndex && this.cursorIndex <= metric.endIndex) {
                // If cursor is within this line, check if it's at the start due to newline
                if (this.cursorIndex === metric.startIndex) {
                    return i;
                }
                // Otherwise, return next line if it exists
                return Math.min(i + 1, lineMetrics.length - 1);
            }
        }
        return lineMetrics.length - 1;
    }

    private calculateCursorRect(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): number[] {
        if (!this.resource.canvasKit) return [];

        if (this.cursorIndex == 0) {
            return [0, 0, 2, fontSize * lineHeight];
        }
        if (text[this.cursorIndex - 1] === "\n") {
            const lineMetrics = paragraph.getLineMetrics();
            const currentLine = this.findLineAfterNewline(lineMetrics);

            if (currentLine < lineMetrics.length) {
                const lineMetric = lineMetrics[currentLine];
                // Position cursor at the start of the current line
                return [0, lineMetric.baseline - fontSize, 2, fontSize * lineHeight];
            }
        }
        //this is not workign wel if wrappped
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
                this.cursorIndex = this.moveCursorUp(text, paragraph)
                break;
            case 'down':
                this.cursorIndex = this.moveCursorDown(text, paragraph)
                break;
            default:
                console.log('direction not implemented');

            // TODO: Implement up/down for multi-line text forward and backard boes not work if wrap
        }

        this.calculateCursorCoord(text, fontSize, lineHeight, paragraph)
    }

    private moveCursorUp(text: string, paragraph: Paragraph): number {
        if (!paragraph) return;

        const lineMetrics = paragraph.getLineMetrics();
        const currentLine = this.findCurrentLine(lineMetrics);

        if (currentLine > 0) {
            const currentLineMetric = lineMetrics[currentLine];
            const targetLineMetric = lineMetrics[currentLine - 1];

            // Get current position within the line
            const currentLineStart = currentLineMetric.startIndex;
            const positionInLine = this.cursorIndex - currentLineStart;

            // Calculate approximate x position based on character position
            const charWidth = this.estimateCharWidth(text, currentLineMetric);
            const targetX = positionInLine * charWidth;

            // Find closest position in target line
            const targetLineStart = targetLineMetric.startIndex;
            const targetLineEnd = targetLineMetric.endIndex;
            const targetLineLength = targetLineEnd - targetLineStart;

            // Estimate position in target line based on x position
            const targetPositionInLine = Math.min(
                Math.round(targetX / charWidth),
                targetLineLength
            );

            return targetLineStart + targetPositionInLine;
        }
    }

    private moveCursorDown(text: string, paragraph: Paragraph): number {
        if (!paragraph) return;

        const lineMetrics = paragraph.getLineMetrics();
        const currentLine = this.findCurrentLine(lineMetrics);

        if (currentLine < lineMetrics.length - 1) {
            const currentLineMetric = lineMetrics[currentLine];
            const targetLineMetric = lineMetrics[currentLine + 1];

            // Get current position within the line
            const currentLineStart = currentLineMetric.startIndex;
            const positionInLine = this.cursorIndex - currentLineStart;

            // Calculate approximate x position based on character position
            const charWidth = this.estimateCharWidth(text, currentLineMetric);
            const targetX = positionInLine * charWidth;

            // Find closest position in target line
            const targetLineStart = targetLineMetric.startIndex;
            const targetLineEnd = targetLineMetric.endIndex;
            const targetLineLength = targetLineEnd - targetLineStart;

            // Estimate position in target line based on x position
            const targetPositionInLine = Math.min(
                Math.round(targetX / charWidth),
                targetLineLength
            );

           return targetLineStart + targetPositionInLine;
        }
    }

    private findCurrentLine(lineMetrics: any[]): number {
        for (let i = 0; i < lineMetrics.length; i++) {
            const metric = lineMetrics[i];
            if (this.cursorIndex >= metric.startIndex && this.cursorIndex <= metric.endIndex) {
                return i;
            }
        }
        return lineMetrics.length - 1;
    }

    private estimateCharWidth(text: string, lineMetric: any): number {
        const lineText = text.substring(lineMetric.startIndex, lineMetric.endIndex);
        const lineWidth = lineMetric.width;
        return lineText.length > 0 ? lineWidth / lineText.length : 10; // fallback width
    }

    updatePosition(x: number, y: number, height: number): void {
        this.textX = x;
        this.textY = y;
        this.height = height;
        this.visible = true;
        // Reset blink timer
        this.startCursorBlink()
    }

    private startCursorBlink(): void {
        this.stopCursorBlink();
        this.visible = true;
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible;
            // Trigger a redraw here - depends on your rendering system
            // this.requestRedraw();
        }, this.blinkSpeed);
    }

    private stopCursorBlink(): void {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        this.visible = false;
    }

    draw(canvas: Canvas): void {
        if (!this.visible || !this.resource) {
            return;
        }
        this.setPaint()

        canvas.drawLine(this.x + this.textX, this.y + this.textY, this.x + this.textX, this.y + this.textY + this.height, this.resource.strokePaint);
    }

    destroy(): void {
        this.stopCursorBlink()
    }
}

export default TextCursor