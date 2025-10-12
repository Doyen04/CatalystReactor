// TextCursor.ts
import { CanvasKitResources } from '@lib/core/CanvasKitResource'
import type { Canvas, LineMetrics, Paragraph } from 'canvaskit-wasm'

class TextCursor {
    private x: number
    private y: number
    private textX: number
    private textY: number
    private height: number
    private visible: boolean = true
    private blinkInterval: ReturnType<typeof setTimeout>
    private blinkSpeed: number = 500 // ms
    private cursorIndex: number

    constructor(initialX: number, initialY: number, initialHeight: number) {
        this.x = initialX
        this.y = initialY
        this.textX = 0
        this.textY = 0
        this.height = initialHeight
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
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }
    setCoord(x: number, y: number) {
        this.x = x
        this.y = y
    }

    setPaint() {
        if (!this.resource) {
            console.log('resource not set')

            return
        }

        this.resource.strokePaint.setColor(this.resource.canvasKit.BLACK)
        this.resource.strokePaint.setStrokeWidth(2)
    }

    setCursorPositionFromCoord(paragraph: Paragraph, text: string, fontSize: number, lineHeight: number, x: number, y: number) {
        const { pos } = paragraph.getGlyphPositionAtCoordinate(x - this.x, y - this.y)

        this.cursorIndex = pos
        this.calculateCursorCoord(text, fontSize, lineHeight, paragraph)
    }

    calculateCursorCoord(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph) {
        const cursorPos = this.calculateCursorRect(text, fontSize, lineHeight, paragraph)

        if (cursorPos.length == 0) return
        this.updatePosition(cursorPos[0], cursorPos[1], cursorPos[3])
    }

    private calculateCursorRect(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): number[] {
        if (!this.resource.canvasKit) return []
        const CK = this.resource.canvasKit

        const lineMetrics = paragraph.getLineMetrics()

        const { current } = this.findCurrentAboveBelowLine(lineMetrics)

        if (!current) return [0, 0, 2, fontSize * lineHeight]
        const height = current.height

        if (this.cursorIndex == 0) {
            return [0, 0, 2, height]
        }

        if (text[this.cursorIndex - 1] === '\n') {
            return [0, current.baseline - current.ascent, 2, height]
        }

        let startIndex = 0
        let endIndex = 0
        if (current.startIndex == this.cursorIndex) {
            startIndex = this.cursorIndex
            endIndex = this.cursorIndex + 1
        } else {
            startIndex = Math.max(0, this.cursorIndex - 1)
            endIndex = this.cursorIndex
        }

        const rects = paragraph.getRectsForRange(startIndex, endIndex, CK.RectHeightStyle.IncludeLineSpacingTop, CK.RectWidthStyle.Tight)

        if (!rects.length) return []
        const [x, y, w, h] = rects[rects.length - 1].rect

        if (current.startIndex == this.cursorIndex) {
            return [x, y, 2, height]
        }
        return [w, y, 2, height]
    }

    moveCursor(direction: 'left' | 'right' | 'up' | 'down', text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): void {
        switch (direction) {
            case 'left':
                this.cursorIndex = Math.max(0, this.cursorIndex - 1)
                break
            case 'right':
                this.cursorIndex = Math.min(text.length, this.cursorIndex + 1)
                break
            case 'up':
                this.cursorIndex = this.moveCursorUp(text, fontSize, lineHeight, paragraph)
                break
            case 'down':
                this.cursorIndex = this.moveCursorDown(text, fontSize, lineHeight, paragraph)
                break
            default:
                console.log('direction not implemented')

            // TODO: Implement up/down for multi-line text forward and backard boes not work if wrap
        }
        this.calculateCursorCoord(text, fontSize, lineHeight, paragraph)
    }

    private findCurrentAboveBelowLine(lineMetrics: LineMetrics[]): {
        current: LineMetrics | null; above: LineMetrics | null; below: LineMetrics | null;
    } {
        const totalLines = lineMetrics.length
        const cursorIndex = this.cursorIndex

        if (totalLines == 0) {
            return { current: null, above: null, below: null }
        }

        for (let index = totalLines - 1; index >= 0; index--) {
            const line = lineMetrics[index];
            const isFirstLine = index === 0;
            const isLastLine = index === totalLines - 1;

            if (cursorIndex >= line.startIndex && cursorIndex <= line.endIndex) {
                return {
                    current: line,
                    above: !isFirstLine ? lineMetrics[index - 1] : null,
                    below: !isLastLine ? lineMetrics[index + 1] : null
                }
            }

        }

        const lastIdx = totalLines - 1;
        return {
            current: lineMetrics[lastIdx],
            above: lastIdx - 1 >= 0 ? lineMetrics[lastIdx - 1] : null,
            below: null,
        };
    }

    private findBestIndexInLine(
        line: LineMetrics,
        targetX: number,
        paragraph: Paragraph
    ): number {
        const CK = this.resource.canvasKit;
        let bestIndex = line.startIndex;

        // For performance, clamp search length
        const endIndex = line.endExcludingWhitespaces;

        for (let i = line.startIndex; i <= endIndex; i++) {
            const rects = paragraph.getRectsForRange(
                i,
                i + 1,
                CK.RectHeightStyle.IncludeLineSpacingMiddle,
                CK.RectWidthStyle.Tight
            );

            if (rects.length > 0) {
                const charLeft = rects[0].rect[0];
                const charRight = rects[0].rect[2];
                const charMid = (charLeft + charRight) / 2;

                // If target is inside this character's box
                if (targetX >= charLeft && targetX <= charRight) {
                    // Decide to place cursor before or after the character
                    return targetX <= charMid ? i : i + 1;
                }

                // If cursor is to the right of this char, move bestIndex forward
                if (targetX > charRight) {
                    bestIndex = i + 1;
                } else {
                    // We've gone past the target
                    break;
                }
            } else {
                // No rect — probably end of line or newline character
                break;
            }
        }

        // ✅ clamp depending on line break type
        if (line.isHardBreak) {
            // Stop at newline boundary — cursor shouldn't go past the line’s endIndex
            return Math.min(bestIndex, line.endIndex);
        } else {
            // For wrapped lines, cursor can move to the *position after last char*
            return Math.min(bestIndex, line.endIndex - 1);
        }
    }


    private moveCursorUp(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): number {
        const metrics = paragraph.getLineMetrics()
        const { above } = this.findCurrentAboveBelowLine(metrics)
       
        if (above == null) return this.cursorIndex

        const coord = this.calculateCursorRect(text, fontSize, lineHeight, paragraph)

        return this.findBestIndexInLine(above, coord[0], paragraph)
    }

    private moveCursorDown(text: string, fontSize: number, lineHeight: number, paragraph: Paragraph): number {
        const lines = paragraph.getLineMetrics()
        const { below } = this.findCurrentAboveBelowLine(lines)

        if (below == null) return this.cursorIndex

        const coord = this.calculateCursorRect(text, fontSize, lineHeight, paragraph)

        return this.findBestIndexInLine(below, coord[0], paragraph)
    }

    updatePosition(x: number, y: number, height: number): void {
        this.textX = x
        this.textY = y
        this.height = height
        this.visible = true
        // Reset blink timer
        this.startCursorBlink()
    }

    startCursorBlink(): void {
        this.stopCursorBlink()
        this.visible = true
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible
            // Trigger a redraw here - depends on your rendering system
            // this.requestRedraw();
        }, this.blinkSpeed)
    }

    stopCursorBlink(): void {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval)
            this.blinkInterval = null
        }
        this.visible = false
    }

    draw(canvas: Canvas): void {
        if (!this.visible || !this.resource) {
            return
        }
        this.setPaint()

        canvas.drawLine(this.textX, this.textY, this.textX, this.textY + this.height, this.resource.strokePaint)
    }

    destroy(): void {
        this.stopCursorBlink()
    }
}

export default TextCursor
