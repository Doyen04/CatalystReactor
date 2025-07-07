import { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";

class Renderer {
    canvasKit: CanvasKit;
    surf: Surface | null;
    canvasEl: HTMLCanvasElement

    paint: Paint;
    strokePaint: Paint;

    dpr: number;

    private isRunning = false;
    private lastTimestamp = 0;
    private fpsInterval = 1000 / 60;


    constructor(canvasKit: CanvasKit, canvasEl: HTMLCanvasElement) {
        this.canvasKit = canvasKit;
        this.canvasEl = canvasEl
        this.surf = null;

        this.dpr = window.devicePixelRatio || 1;

        this.makeSurface()
        this.setUpPaint()
    }

    setUpPaint() {
        this.paint = new this.canvasKit.Paint();
        this.paint.setColor(this.canvasKit.Color(60, 0, 0, 255));
        this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
        this.paint.setAntiAlias(true);

        this.strokePaint = new this.canvasKit.Paint();
        this.strokePaint.setColor(this.canvasKit.Color(0, 255, 0, 255));
        this.strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
        this.strokePaint.setStrokeWidth(2);
        this.strokePaint.setAntiAlias(true);
    }

    makeSurface() {
        if (!this.canvasKit) throw new Error("CanvasKit not initialized");

        if (this.surf) {
            this.surf.delete();
            this.surf = null;
        }

        this.surf = this.canvasKit.MakeWebGLCanvasSurface(this.canvasEl);
        console.log(this.surf);


        if (!this.surf) throw new Error("Could not create CanvasKit surface");
        // this.skCnvs = this.surf.getCanvas();

    }

    private drawFrame = (canvas: Canvas) => {
        if (!this.isRunning) return;

        const now = performance.now();
        const elapsed = now - this.lastTimestamp;
        if (elapsed >= this.fpsInterval) {
            this.lastTimestamp = now - (elapsed % this.fpsInterval);
            this.render(canvas);
        }
        if (this.isRunning) {
            this.surf?.requestAnimationFrame(this.drawFrame);
        }
    };

    public stopLoop() {
        this.isRunning = false;
    }

    startLoop(fps: number = 60) {
        this.fpsInterval = 1000 / fps;
        this.lastTimestamp = performance.now();
        this.isRunning = true;
        this.surf?.requestAnimationFrame(this.drawFrame);
    }

    render(skCnvs: Canvas) {
        if (!this.canvasKit || !this.surf || !skCnvs) return;

        skCnvs.clear(this.canvasKit.TRANSPARENT);
        skCnvs!.save();
        skCnvs.scale(this.dpr, this.dpr);

        this.scene.updateWorldMatrix();

        const rect = this.canvasKit.LTRBRect(10, 10, 250, 100);
        skCnvs!.drawRect(rect, this.paint!);
        skCnvs!.drawRect(rect, this.strokePaint!);

        this.renderNode(skCnvs, this.scene);

        if (this.dimensionMod.hasShape()) {
            this.dimensionMod.draw(skCnvs, this.canvasKit, this.paint!, this.strokePaint!);
        }

        skCnvs!.restore();
        this.surf.flush();
    }
}

export default Renderer;