import { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";
import EventQueue, { EventTypes, } from './EventQueue'
import SceneManager from "./SceneManager";
import type SceneNode from "./SceneGraph";
import CanvasKitResources from "./CanvasKitResource";

const { CreateSurface } = EventTypes

class Renderer {
    sceneManager: SceneManager
    surf: Surface | null;
    canvasEl: HTMLCanvasElement

    dpr: number = window.devicePixelRatio || 1;;

    private isRunning = false;
    private lastTimestamp = 0;
    private fpsInterval = 1000 / 60;


    constructor(canvasEl: HTMLCanvasElement, sceneManager: SceneManager) {
        this.canvasEl = canvasEl;
        this.sceneManager = sceneManager;
        this.surf = null;

        EventQueue.subscribe(CreateSurface, this.setUpRendering.bind(this))

        this.setUpRendering()
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        return (resources) ? resources : null
    }

    setUpRendering() {
        console.log('setuprendering');

        this.stopLoop()

        setTimeout(() => {
            this.makeSurface()
            this.startLoop();
        }, 0);
    }

    makeSurface() {
        if (!this.resource) return

        const { width, height } = getComputedStyle(this.canvasEl);
        console.log(width, height);

        this.canvasEl.width = parseInt(width) * this.dpr;
        this.canvasEl.height = parseInt(height) * this.dpr; // set canvas height

        if (!this.resource.canvasKit) throw new Error("CanvasKit not initialized");

        if (this.surf) {
            this.surf.delete();
            this.surf = null;
        }

        this.surf = this.resource.canvasKit.MakeWebGLCanvasSurface(this.canvasEl);
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
        if (!this.resource.canvasKit || !this.surf || !skCnvs) return;

        skCnvs.clear(this.resource.canvasKit.TRANSPARENT);
        skCnvs!.save();
        skCnvs.scale(this.dpr, this.dpr);

        const scene = this.sceneManager.getScene()
        const shapeModifier = this.sceneManager.getDimModifier()
        const transientShape = this.sceneManager.getTransientShape()
        scene.updateWorldMatrix();

        const rect = this.resource.canvasKit.LTRBRect(10, 10, 250, 100);
        skCnvs!.drawRect(rect, this.resource.paint!);
        skCnvs!.drawRect(rect, this.resource.strokePaint!);

        this.renderNode(skCnvs, scene);

        if (transientShape) {
            transientShape.shape.draw(skCnvs)
        }

        if (shapeModifier.hasShape()) {
            shapeModifier.draw(skCnvs);
        }

        skCnvs!.restore();
        this.surf.flush();
    }

    renderNode(skCnvs: Canvas, node: SceneNode) {
        // Draw the shape if it exists
        if (node.shape && typeof node.shape.draw === 'function') {
            node.shape.draw(skCnvs!);
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
    }
}

export default Renderer;