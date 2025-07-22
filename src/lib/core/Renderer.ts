import { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";
import EventQueue, { EventTypes, } from './EventQueue'
import SceneManager from "./SceneManager";
import type SceneNode from "./SceneGraph";
import CanvasKitResources from "./CanvasKitResource";

const { CreateSurface, Render } = EventTypes

class Renderer {
    sceneManager: SceneManager
    surf: Surface | null;
    canvasEl: HTMLCanvasElement

    dpr: number = window.devicePixelRatio || 1;
    skCnvs: Canvas;

    private isRunning = false;
    private lastTimestamp = 0;
    private fpsInterval = 1000 / 60;
    private animationId: number;
    private canrender: boolean = false;


    constructor(canvasEl: HTMLCanvasElement, sceneManager: SceneManager) {
        this.canvasEl = canvasEl;
        this.sceneManager = sceneManager;
        this.surf = null;
        this.animationId = null

        this.setUpEvent()

        this.setUpRendering()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    removeEvent() {
        EventQueue.unSubscribeAll(CreateSurface)
        EventQueue.unSubscribeAll(Render)
    }
    addEvent() {
        EventQueue.subscribe(CreateSurface, this.setUpRendering.bind(this))
        EventQueue.subscribe(Render, this.setCanRender.bind(this))
    }
    setCanRender(){
        this.canrender = true
    }
    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }

    setUpRendering() {
        console.log('setuprendering');

        this.stopLoop()

        requestAnimationFrame(() => {
            this.makeSurface()
            this.startLoop();
        });
    }

    makeSurface() {
        if (!this.resource) {
            console.log('resoures not found in renderer');

            return
        }

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
        this.skCnvs = this.surf.getCanvas();

    }

    private drawFrame = (canvas: Canvas) => {
        if (!this.isRunning) {
            console.log('not running render');

            return;
        }

        const now = performance.now();
        const elapsed = now - this.lastTimestamp;
        if (elapsed >= this.fpsInterval) {
            this.lastTimestamp = now - (elapsed % this.fpsInterval);
            this.render(canvas);
        }
        if (this.isRunning) {
            this.animationId = this.surf?.requestAnimationFrame(this.drawFrame);
        }
    };

    public stopLoop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    startLoop(fps: number = 60) {
        this.fpsInterval = 1000 / fps;
        this.lastTimestamp = performance.now();
        this.isRunning = true;
        this.animationId = this.surf?.requestAnimationFrame(this.drawFrame);
    }

    render(skCnvs?: Canvas) {
        skCnvs = (skCnvs) ? skCnvs : this.skCnvs
        if (!this.resource.canvasKit || !this.surf || !skCnvs) {
            console.log('log error with surface');

            return;
        }

        skCnvs.clear(this.resource.canvasKit.TRANSPARENT);
        skCnvs!.save();
        skCnvs.scale(this.dpr, this.dpr);

        const scene = this.sceneManager.getScene()
        const shapeModifier = this.sceneManager.getDimModifier()
        const transientShape = this.sceneManager.getTransientScene()
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
        this.canvasEl = null;
        this.sceneManager = null;
        this.animationId = null
        this.removeEvent()
    }
}

export default Renderer;