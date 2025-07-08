import { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";
import EventQueue, { EventTypes, } from './EventQueue'
import SceneManager from "./SceneManager";
import type SceneNode from "./SceneGraph";

const { CreateSurface } = EventTypes

class Renderer {
    sceneManager: SceneManager
    canvasKit: CanvasKit;
    surf: Surface | null;
    canvasEl: HTMLCanvasElement

    paint: Paint;
    strokePaint: Paint;

    dpr: number = window.devicePixelRatio || 1;;

    private isRunning = false;
    private lastTimestamp = 0;
    private fpsInterval = 1000 / 60;


    constructor(canvasKit: CanvasKit, canvasEl: HTMLCanvasElement, sceneManager: SceneManager) {
        this.canvasKit = canvasKit;
        this.canvasEl = canvasEl;
        this.sceneManager = sceneManager;
        this.surf = null;

        this.setUpPaint()

        EventQueue.subscribe(CreateSurface, this.setUpRendering.bind(this))

        this.setUpRendering()
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

    setUpRendering() {console.log('setuprendering');
    
        this.stopLoop()

        setTimeout(() => {
            this.makeSurface()
            this.startLoop();
        }, 0);
    }

    makeSurface() {
        const { width, height } = getComputedStyle(this.canvasEl);
        console.log(width, height);

        this.canvasEl.width = parseInt(width) * this.dpr;
        this.canvasEl.height = parseInt(height) * this.dpr; // set canvas height

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

        const scene = this.sceneManager.getScene()
        const shapeModifier = this.sceneManager.getDimModifier()
        const transientShape = this.sceneManager.getTransientShape()
        scene.updateWorldMatrix();

        const rect = this.canvasKit.LTRBRect(10, 10, 250, 100);
        skCnvs!.drawRect(rect, this.paint!);
        skCnvs!.drawRect(rect, this.strokePaint!);

        this.renderNode(skCnvs, scene);

        if (transientShape) {
            transientShape.shape.draw(skCnvs, this.canvasKit, this.paint!, this.strokePaint!)
        }

        if (shapeModifier.hasShape()) {
            shapeModifier.draw(skCnvs, this.canvasKit, this.paint!, this.strokePaint!);
        }

        skCnvs!.restore();
        this.surf.flush();
    }

    renderNode(skCnvs: Canvas, node: SceneNode) {
        // Draw the shape if it exists
        if (node.shape && typeof node.shape.draw === 'function') {
            node.shape.draw(skCnvs!, this.canvasKit!, this.paint!, this.strokePaint!);
        }

        // Render children
        for (const child of node.children) {
            this.renderNode(skCnvs, child);
        }
    }
    
    destroy() {
        this.stopLoop()

        // Clean up surface
        if (this.surf) {
            this.surf.delete();
            this.surf = null;
        }
        // Clean up paints
        this.paint?.delete();
        this.strokePaint?.delete();
    }
}

export default Renderer;