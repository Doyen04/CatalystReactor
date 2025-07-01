import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import type Shape from "./Shape";

class DimensionModifier {
    private shape: Shape | null;
    private originalDimensions: Shape | null;
    private isHovered: boolean;
    private strokeColor: string | number[];
    private strokeWidth: number;

    constructor() {
        this.shape = null;
        this.originalDimensions = null;
        this.isHovered = false;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
    }
    setShape(shape: Shape) {
        this.shape = shape;
    }
    setPaint(canvasKit: CanvasKit, strokePaint: Paint): void {

        const strokeColor = (Array.isArray(this.strokeColor)) ? this.strokeColor : canvasKit.parseColorString(this.strokeColor)

        strokePaint.setColor(strokeColor);
        strokePaint.setStyle(canvasKit.PaintStyle.Stroke);
        strokePaint.setStrokeWidth(this.strokeWidth);
        strokePaint.setAntiAlias(true);
    }
    hasShape(){
        return this.shape !== null;
    }
    getShapeDim(){
        // console.log(this.shape?.x,this.shape?.y, this.shape?.width, this.shape?.height);
        // console.log(this.shape?.boundingRect);
    }
    draw(canvas: Canvas, canvasKit: CanvasKit, paint: Paint, strokePaint: Paint): void {
        if(!this.shape) return;

        this.setPaint(canvasKit, strokePaint);
        const dimen = this.shape.boundingRect;
        const rect = canvasKit.LTRBRect(dimen.left, dimen.top, dimen.right, dimen.bottom);

        canvas.drawRect(rect, strokePaint);
    }


}


export default DimensionModifier;