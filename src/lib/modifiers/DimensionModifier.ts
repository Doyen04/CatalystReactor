import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import type { Shape } from "@/lib/shapes";
import { Handle } from "@/lib/modifiers";

export const ModifierPos = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
];

class DimensionModifier {
    private shape: Shape | null;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private size: number = 5; // Default radius for the resizers
    private handles: Handle[];

    constructor() {
        this.shape = null;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
        this.handles = [];
    }
    setShape(shape: Shape) {
        this.handles = []
        this.shape = shape;
        this.handles = this.shape.getHandles(this.size, this.strokeColor);
    }
    updateResizerPositions() {
        if (!this.shape) return;

        for (const resizer of this.handles) {
            const { x, y } = this.shape.getModifersPos(resizer.pos, this.size, resizer.type);
            resizer.updatePosition(x, y);
        }

    }
    setPaint(canvasKit: CanvasKit, strokePaint: Paint): void {

        const strokeColor = (Array.isArray(this.strokeColor)) ? this.strokeColor : canvasKit.parseColorString(this.strokeColor)

        strokePaint.setColor(strokeColor);
        strokePaint.setStyle(canvasKit.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(this.strokeWidth);
        strokePaint.setAntiAlias(true);
    }
    hasShape() {
        return this.shape !== null;
    }
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
        if (!this.shape) return;

        this.updateResizerPositions()// bad practice
        this.setPaint(canvasKit, strokePaint);
        const dimen = this.shape.boundingRect;
        const rect = canvasKit.LTRBRect(dimen.left, dimen.top, dimen.right, dimen.bottom);

        canvas.drawRect(rect, strokePaint);

        this.handles.forEach(handle => {
            handle.draw(canvas, canvasKit, paint, strokePaint);
        });
    }


}


export default DimensionModifier;