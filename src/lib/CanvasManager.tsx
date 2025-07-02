import type { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";
import SceneNode from "./SceneGraph";
import type Matrix from "./Matrix";
import Rectangle from "./Rect";
import DimensionModifier from "./DimensionModifier";
import Oval from "./Oval";


class CanvasManager {
    canvasEl: HTMLCanvasElement;
    canvasKit: CanvasKit | null;
    selected: SceneNode | null;
    activeShape: SceneNode | null;

    dimensionMod: DimensionModifier;
    // skCnvs: Canvas | null;
    surf: Surface | null;
    scene: SceneNode;
    paint: Paint;
    strokePaint: Paint;

    dpr: number;
    isMouseDown: boolean;
    isDragging: boolean;
    dragStart: { x: number, y: number } | null;
    currentTool: string;

    undoStack: never[];
    redoStack: never[];

    private isRunning = false;
    private lastTimestamp = 0;
    private fpsInterval = 1000 / 60;

    private boundOnPointerDown: (e: MouseEvent) => void;
    private boundOnPointerMove: (e: MouseEvent) => void;
    private boundOnPointerUp: (e: MouseEvent) => void;
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundResize: (e?: Event) => void;


    constructor(canvas: HTMLCanvasElement, canvasKit: CanvasKit) {
        this.canvasEl = canvas;
        this.canvasKit = canvasKit;
        this.surf = null;
        this.dpr = window.devicePixelRatio || 1;

        // this.skCnvs = null;
        this.paint = new this.canvasKit.Paint();
        this.strokePaint = new this.canvasKit.Paint();
        this.scene = new SceneNode();
        this.dimensionMod = new DimensionModifier();

        this.selected = null;
        this.activeShape = null;

        // Input handling state
        this.isDragging = false;
        this.isMouseDown = false;
        this.dragStart = null;
        this.currentTool = 'select';
        this.undoStack = [];
        this.redoStack = [];

        this.boundOnPointerDown = this.onPointerDown.bind(this);
        this.boundOnPointerMove = this.onPointerMove.bind(this);
        this.boundOnPointerUp = this.onPointerUp.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this)
        this.boundResize = this.resize.bind(this);

        this.resize()

        // Bind events
        this.canvasEl.addEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.addEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.addEventListener('mouseup', this.boundOnPointerUp);
        this.canvasEl.addEventListener('keydown', this.boundOnKeyDown)
        window.addEventListener('resize', this.boundResize);
    }

    resize(e?: Event): void {
        console.log("resizing----5----");

        const { width, height } = getComputedStyle(this.canvasEl);
        console.log(width, height);

        this.canvasEl.width = parseInt(width) * this.dpr;
        this.canvasEl.height = parseInt(height) * this.dpr; // set canvas height

        this.stopLoop()

        setTimeout(() => {
            this.makeSurface();
            this.startLoop();
        }, 0);
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

        if (this.paint) {
            this.paint.delete();
        }
        this.paint = new this.canvasKit.Paint();
        this.paint.setColor(this.canvasKit.Color(0, 0, 0, 255));
        this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
        this.paint.setAntiAlias(true);


        if (this.strokePaint) {
            this.strokePaint.delete();
        }
        this.strokePaint = new this.canvasKit.Paint();
        this.strokePaint.setColor(this.canvasKit.Color(0, 255, 0, 255));
        this.strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
        this.strokePaint.setStrokeWidth(2);
        this.strokePaint.setAntiAlias(true);
    }

    setTool(tool: string): void {
        this.currentTool = tool;
    }

    addNode(node: SceneNode, parent = this.scene) {
        parent.addChildNode(node);
        // this.pushHistory();
        // this.render();
    }

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.removeChildNode(node);
            // this.pushHistory();
        }
    }

    onKeyDown(e: KeyboardEvent){

    }
    onPointerDown(e: MouseEvent) {
        console.log('down', this.currentTool);
        this.isMouseDown = true;
        this.isDragging = false;
        this.dragStart = { x: e.offsetX, y: e.offsetY };
        switch (this.currentTool) {
            case 'select':
                break;
            case 'square':
                console.log(e);
                this.createRect(e.offsetX, e.offsetY);
                break;
            case 'oval':
                console.log(e);
                this.createOval(e.offsetX, e.offsetY);
                break;
            default:
                break
        }
    }

    onPointerMove(e: MouseEvent) {

        if (this.isMouseDown) {
            this.isDragging = true;
        }
        if (this.isDragging && this.activeShape && this.currentTool === 'square') {
            this.activeShape.shape?.setSize(this.dragStart!, e.offsetX, e.offsetY, e.shiftKey);
        }else if (this.isDragging && this.activeShape && this.currentTool === 'oval') {
            this.activeShape.shape?.setSize(this.dragStart!,e.offsetX, e.offsetY, e.shiftKey);
        }
    }

    onPointerUp(e: MouseEvent) {
        console.log('up');

        this.isMouseDown = false;
        this.isDragging = false;
        this.discardTinyShapes();
        this.activeShape = null;
        console.log(this.scene, this.dimensionMod.getShapeDim());

    }

    discardTinyShapes() {
        if (!this.activeShape || !this.activeShape.shape) return;

        const minSize = 5;

        if (this.activeShape.shape instanceof Rectangle) {
            const rect = this.activeShape.shape as Rectangle;

            if (rect.width < minSize || rect.height < minSize) {
                this.removeNode(this.activeShape);
                console.log('Shape removed: too small');
            }
        }else if (this.activeShape.shape instanceof Oval) {
            const oval = this.activeShape.shape as Oval;

            if (oval.radius < minSize) {
                this.removeNode(this.activeShape);
                console.log('Shape removed: too small');
            }
        }
    }

    createRect(mx: number, my: number): void {
        const node: SceneNode = new SceneNode();
        node.shape = new Rectangle(mx, my);
        this.addNode(node);
        this.activeShape = node;
        this.dimensionMod.setShape(node.shape)
        // this.pushHistory();
    }
    createOval(mx: number, my: number): void {
        const node: SceneNode = new SceneNode();
        node.shape = new Oval(mx, my);
        this.addNode(node);
        this.activeShape = node;
        this.dimensionMod.setShape(node.shape)
        // this.pushHistory();
    }

    hitTest(node: SceneNode, pt: string) {
        // Traverse children in reverse draw order
        // for (let i = node.children.length - 1; i >= 0; i--) {
        //     const child = node.children[i];
        //     const hit = this.hitTest(child, pt);
        //     if (hit) return hit;
        // }
        // if (node.shape && node.shape.contains(pt.x, pt.y, this.ctx)) {
        //     return node;
        // }
        // return null;
    }

    pushHistory() {
        // const snapshot = JSON.stringify(this.scene);
        // this.undoStack.push(snapshot);
        // this.redoStack = [];
    }

    undo() {
        // if (this.undoStack.length > 1) {
        //     this.redoStack.push(this.undoStack.pop());
        //     const prev = this.undoStack[this.undoStack.length - 1];
        //     this.scene = Node.fromJSON(prev);
        //     this.render();
        // }
    }

    redo() {
        // if (this.redoStack.length > 0) {
        //     const next = this.redoStack.pop();
        //     this.undoStack.push(next);
        //     this.scene = Node.fromJSON(next);
        //     this.render();
        // }
    }

    clear() {
        // this.scene = new Node();
        // this.pushHistory();
        // this.render();
    }

    exportData() {
        // return this.canvas.toDataURL('image/png');
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
        
        if(this.dimensionMod.hasShape()){
            this.dimensionMod.draw(skCnvs, this.canvasKit, this.paint!, this.strokePaint!);
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

    convertToSkiaMatrix(matrix: Matrix) {
        // // Convert your Matrix to CanvasKit matrix format
        // const skMatrix = this.canvasKit!.Matrix.identity(); // Implement based on your Matrix class
        // // Apply conversion logic here using the 'matrix' parameter
        // return skMatrix;
    }
    removeEventListener() {
        if (!this.canvasEl) return;

        this.canvasEl.removeEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.removeEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.removeEventListener('mouseup', this.boundOnPointerUp);
        this.canvasEl.removeEventListener('keydown', this.boundOnKeyDown)
        window.removeEventListener('resize', this.boundResize);
        this.stopLoop();
    }
}


export default CanvasManager;
