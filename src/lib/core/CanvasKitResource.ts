// CanvasKitResources.ts

import type { CanvasKit, Paint, ParagraphStyle, TextStyle, FontMgrFactory } from "canvaskit-wasm";

export class CanvasKitResources {
    private static instance: CanvasKitResources;

    public readonly paint: Paint;
    public readonly strokePaint: Paint;
    public textStyle: TextStyle;
    public readonly paragraphStyle: ParagraphStyle;
    public fontMgr: FontMgrFactory;
    public readonly canvasKit: CanvasKit;

    private constructor(canvasKit: CanvasKit) {
        this.canvasKit = canvasKit

        if (!this.canvasKit) return

        this.paint = new this.canvasKit.Paint();
        this.paint.setColor(this.canvasKit.Color(60, 0, 0, 255));
        this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
        this.paint.setAntiAlias(true);

        this.strokePaint = new this.canvasKit.Paint();
        this.strokePaint.setColor(this.canvasKit.Color(0, 255, 0, 255));
        this.strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
        this.strokePaint.setStrokeWidth(2);
        this.strokePaint.setAntiAlias(true);

        const fontSize = 16
        this.textStyle = new this.canvasKit.TextStyle({
            color: this.canvasKit.BLACK,
            fontSize: fontSize,
            fontFamilies: [],
            fontVariations: [
                { axis: 'wght', value: 500 },
                { axis: 'opsz', value: fontSize }
            ]
        });

        this.paragraphStyle = new this.canvasKit.ParagraphStyle({
            textStyle: this.textStyle,
            textAlign: this.canvasKit.TextAlign.Left,
        });

        this.fontMgr = this.canvasKit.FontMgr;
    }

    public static initialize(CanvasKit: CanvasKit) {
        if (!this.instance) {
            this.instance = new CanvasKitResources(CanvasKit);
        }
        return this.instance;
    }

    public static getInstance(): CanvasKitResources {
        if (!this.instance) {
            throw new Error(
                "CanvasKitResources not initialized. Call CanvasKitResources.initialize(CanvasKit) first."
            );
        }
        return this.instance;
    }

    public dispose() {
        this.paint.delete();
        this.strokePaint.delete()
        this.textStyle = null;
        this.fontMgr = null;
        // Note: ParagraphStyle may not need explicit delete depending on usage.
    }
}

export default CanvasKitResources