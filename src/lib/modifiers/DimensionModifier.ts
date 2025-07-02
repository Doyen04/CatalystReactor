import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import type { Shape } from "../shapes";
import { Oval, Rectangle } from "../shapes";

class DimensionModifier {
    private shape: Shape | null;
    private originalDimensions: Shape | null;
    private isHovered: boolean;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private bRadiusResizer: Oval[]

    constructor() {
        this.shape = null;
        this.originalDimensions = null;
        this.isHovered = false;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
        this.bRadiusResizer = [];
    }
    setShape(shape: Shape) {
        this.shape = shape;
        if (this.shape instanceof Rectangle) {
            for (let i = 0; i < 4; i++) {
                this.bRadiusResizer.push(new Oval(0, 0));
                this.bRadiusResizer[i].setRadius(10);
            }
        }
    }
    updateResizerPositions() {
        // if (!this.shape || this.bRadiusResizer.length === 0) return;

        // const bounds = this.shape.boundingRect;
        // const radius = this.shape.bdradius || 0;

        // // Top-left
        // this.bRadiusResizer[0].x = bounds.left + radius;
        // this.bRadiusResizer[0].y = bounds.top + radius;

        // // Top-right
        // this.bRadiusResizer[1].x = bounds.right - radius;
        // this.bRadiusResizer[1].y = bounds.top + radius;

        // // Bottom-right
        // this.bRadiusResizer[2].x = bounds.right - radius;
        // this.bRadiusResizer[2].y = bounds.bottom - radius;

        // // Bottom-left
        // this.bRadiusResizer[3].x = bounds.left + radius;
        // this.bRadiusResizer[3].y = bounds.bottom - radius;

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
    getShapeDim() {
        // console.log(this.shape?.x,this.shape?.y, this.shape?.width, this.shape?.height);
        // console.log(this.shape?.boundingRect);
    }
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
        if (!this.shape) return;

        this.updateResizerPositions()
        this.setPaint(canvasKit, strokePaint);
        const dimen = this.shape.boundingRect;
        const rect = canvasKit.LTRBRect(dimen.left, dimen.top, dimen.right, dimen.bottom);

        canvas.drawRect(rect, strokePaint);

        if (this.shape instanceof Rectangle && this.bRadiusResizer.length > 0) {
            for (const resizer of this.bRadiusResizer) {
                resizer.draw(canvas, canvasKit, paint, strokePaint);
            }
        }
    }


}


export default DimensionModifier;