// CanvasKitResources.ts

import type { CanvasKit, ParagraphStyle, TextStyle, FontMgr, Path } from 'canvaskit-wasm'
import fontMap from '@/lib/core/fonts.json'

export class CanvasKitResources {
    private static instance: CanvasKitResources
    private static cnvsFontData: ArrayBuffer[] = []
    private static fontsLoaded: boolean = false
    private static fontLoadPromise: Promise<void> | null = null

    private cnvsTextStyle: TextStyle
    private cnvsParagraphStyle: ParagraphStyle
    private cnvsFontMgr: FontMgr | null
    private cnvsCanvasKit: CanvasKit
    private cnvsPath: Path
    

    private constructor(canvasKit: CanvasKit) {
        this.cnvsCanvasKit = canvasKit
        this.cnvsPath = new canvasKit.Path()
    }

    get path() {
        return this.cnvsPath
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
            console.log(CanvasKitResources.cnvsFontData.length, 'fonts loaded');
            this.cnvsFontMgr = this.cnvsCanvasKit.FontMgr.FromData(...CanvasKitResources.cnvsFontData)
        } else {
            console.log('no fonts')
        }
    }

    static async loadInterFont() {
        if (this.fontsLoaded || this.cnvsFontData.length > 0) return
        // If a load is in-flight, await it
        if (this.fontLoadPromise) {
            await this.fontLoadPromise
            return
        }

        this.fontLoadPromise = (async () => {
            const families = Object.keys(fontMap)
            console.log('loading fonts', families,)

            const SecondFont = []
            for (const family of families) {
                const urls = fontMap[family]
                if (urls) {
                    const fontPromises = urls.map(url => fetch(url).then(res => {
                        if (!res.ok) throw new Error(`Failed to load font: ${url}`);
                        return res.arrayBuffer();
                    }))
                    SecondFont.push(...fontPromises)
                }
            }
            const fontResults = await Promise.allSettled(SecondFont)

            const fonts = fontResults.filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            console.log(fonts.length, 'additional fonts loaded');


            const loadFont = await Promise.all([
                fetch('/fonts/Inter-VariableFont_opsz,wght.ttf'),
                fetch('/fonts/Inter-Italic-VariableFont_opsz,wght.ttf'),
            ])

            const [normalData, italicData] = await Promise.all([loadFont[0].arrayBuffer(), loadFont[1].arrayBuffer()])

            CanvasKitResources.cnvsFontData = [normalData, italicData, ...fonts]
            CanvasKitResources.fontsLoaded = true
        })()
        try {
            await CanvasKitResources.fontLoadPromise
        } finally {
            CanvasKitResources.fontLoadPromise = null
        }
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
            throw new Error('CanvasKitResources not initialized. Call CanvasKitResources.initialize(CanvasKit) first.')
        }
        return this.instance
    }

    public dispose() {
        this.cnvsFontMgr.delete()
        this.cnvsTextStyle = null
        this.cnvsFontMgr = null
        CanvasKitResources.cnvsFontData = []
        CanvasKitResources.instance = null
        console.log('deleting all canvaskit object')
        // Note: ParagraphStyle may not need explicit delete depending on usage.
    }
}

export default CanvasKitResources
