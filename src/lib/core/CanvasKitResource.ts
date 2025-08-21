// CanvasKitResources.ts

import type {
    CanvasKit,
    Paint,
    ParagraphStyle,
    TextStyle,
    FontMgr,
    Path,
} from 'canvaskit-wasm'

export class CanvasKitResources {
    private static instance: CanvasKitResources
    private static cnvsFontData: ArrayBuffer[] = []

    private cnvsPaint: Paint
    private cnvsStrokePaint: Paint
    private cnvsTextStyle: TextStyle
    private cnvsParagraphStyle: ParagraphStyle
    private cnvsFontMgr: FontMgr | null
    private cnvsCanvasKit: CanvasKit
    private cnvsPath: Path

    private constructor(canvasKit: CanvasKit) {
        this.cnvsCanvasKit = canvasKit
        this.cnvsPath = new canvasKit.Path()
        this.setUpPaints()
    }

    setUpPaints() {
        if (!this.cnvsCanvasKit) {
            console.error('no canvas kit in canvaskitresourse')
            return
        }
        this.cnvsPaint = new this.cnvsCanvasKit.Paint()
        this.cnvsPaint.setColor(this.cnvsCanvasKit.Color(60, 0, 0, 0.3))
        this.cnvsPaint.setStyle(this.cnvsCanvasKit.PaintStyle.Fill)
        this.cnvsPaint.setAntiAlias(true)

        this.cnvsStrokePaint = new this.cnvsCanvasKit.Paint()
        this.cnvsStrokePaint.setColor(this.cnvsCanvasKit.Color(0, 255, 0, 1))
        this.cnvsStrokePaint.setStyle(this.cnvsCanvasKit.PaintStyle.Stroke)
        this.cnvsStrokePaint.setStrokeWidth(2)
        this.cnvsStrokePaint.setAntiAlias(true)
    }
    get path() {
        return this.cnvsPath
    }
    get paint() {
        return this.cnvsPaint
    }
    get strokePaint() {
        return this.cnvsStrokePaint
    }
    get textStyle() {
        return this.cnvsTextStyle
    }
    get paragraphStyle() {
        return this.cnvsParagraphStyle
    }
    get canvasKit() {
        return this.cnvsCanvasKit
    }
    get fontMgr() {
        return this.cnvsFontMgr
    }
    get fontData() {
        return CanvasKitResources.cnvsFontData
    }
    setUpStyles() {
        if (!this.cnvsCanvasKit) {
            console.error('no canvas kit in canvaskitresourse')
            return
        }
        const fontSize = 16
        this.cnvsTextStyle = new this.cnvsCanvasKit.TextStyle({
            color: this.cnvsCanvasKit.BLACK,
            fontSize: fontSize,
            fontFamilies: [],
            fontVariations: [
                { axis: 'wght', value: 500 },
                { axis: 'opsz', value: fontSize },
            ],
        })

        this.cnvsParagraphStyle = new this.cnvsCanvasKit.ParagraphStyle({
            textStyle: this.cnvsTextStyle,
            textAlign: this.cnvsCanvasKit.TextAlign.Left,
        })

        if (CanvasKitResources.cnvsFontData.length > 0) {
            this.cnvsFontMgr = this.cnvsCanvasKit.FontMgr.FromData(
                ...CanvasKitResources.cnvsFontData
            )
        } else {
            console.log('no fonts')
        }
    }

    static async loadInterFont() {
        if (this.cnvsFontData.length != 0) return

        const loadFont = await Promise.all([
            fetch('/fonts/Inter-VariableFont_opsz,wght.ttf'),
            fetch('/fonts/Inter-Italic-VariableFont_opsz,wght.ttf'),
        ])

        const [normalData, italicData] = await Promise.all([
            loadFont[0].arrayBuffer(),
            loadFont[1].arrayBuffer(),
        ])

        CanvasKitResources.cnvsFontData = [normalData, italicData]
        // Create a new FontMgr instance
    }

    public static initialize(CanvasKit: CanvasKit) {
        if (!this.instance) {
            console.log('initialising canvaskit resources')
            this.instance = new CanvasKitResources(CanvasKit)
            this.instance.setUpStyles()
        }
        return this.instance
    }

    public static getInstance(): CanvasKitResources {
        if (!this.instance) {
            throw new Error(
                'CanvasKitResources not initialized. Call CanvasKitResources.initialize(CanvasKit) first.'
            )
        }
        return this.instance
    }

    public dispose() {
        this.cnvsPaint.delete()
        this.cnvsStrokePaint.delete()
        this.cnvsFontMgr.delete()
        this.cnvsPaint.delete()

        this.cnvsPaint = null
        this.cnvsStrokePaint = null
        this.cnvsTextStyle = null
        this.cnvsFontMgr = null
        CanvasKitResources.cnvsFontData = []
        CanvasKitResources.instance = null
        console.log('deleting all canvaskit object')
        // Note: ParagraphStyle may not need explicit delete depending on usage.
    }
}

export default CanvasKitResources
