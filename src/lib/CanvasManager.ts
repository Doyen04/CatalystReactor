import type { Canvas, CanvasKit, Paint, Surface } from "canvaskit-wasm";
import SceneNode from "./SceneGraph";
import type Matrix from "./Matrix";


class CanvasManager {
    canvasEl: HTMLCanvasElement;
    canvasKit: CanvasKit | null;
    selected: any;
    dpr: number;
    surf: Surface | null;
    skCnvs: Canvas | null;
    scene: SceneNode;
    paint:Paint | null;
    isDragging: boolean;
    dragStart: null;
    currentTool: string;
    undoStack: never[];
    redoStack: never[];

    constructor(canvas: HTMLCanvasElement, canvasKit: CanvasKit) {
        this.canvasEl = canvas;
        this.canvasKit = canvasKit;
        this.surf = null;
        this.dpr = window.devicePixelRatio || 1;

        this.skCnvs = null;
        this.paint = null;
        this.scene = new SceneNode();

        this.selected = null;

        // Input handling state
        this.isDragging = false;
        this.dragStart = null;
        this.currentTool = 'select'; 
        this.undoStack = [];
        this.redoStack = [];

        this.makeSurface();
        this.resize()

        // Bind events
        this.canvasEl.addEventListener('mousedown', e => this.onPointerDown(e));
        this.canvasEl.addEventListener('mousemove', e => this.onPointerMove(e));
        this.canvasEl.addEventListener('mouseup', e => this.onPointerUp(e));
        window.addEventListener('resize', e => this.resize(e));
    }

    resize(e?: Event): void {
        console.log("resizing----5----");

        const { width, height } = getComputedStyle(this.canvasEl);
        console.log(width, height);

        this.canvasEl.width = parseInt(width) * this.dpr;
        this.canvasEl.height = parseInt(height) * this.dpr; // set canvas height

        this.makeSurface();
        this.render();
    }
    makeSurface() {
        if (!this.canvasKit) throw new Error("CanvasKit not initialized");

        if (this.surf) {
            this.surf.delete();
        }

        this.surf = this.canvasKit.MakeWebGLCanvasSurface(this.canvasEl);

        if (!this.surf) throw new Error("Could not create CanvasKit surface");
        this.skCnvs = this.surf.getCanvas();

        if (this.paint) {
            this.paint.delete();
        }
        this.paint = new this.canvasKit.Paint();
    }

    setTool(tool: string): void {
        this.currentTool = tool;
    }

    addNode(node: SceneNode, parent = this.scene) {
        parent.add(node);
        this.pushHistory();
        this.render();
    }

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.remove(node);
            this.pushHistory();
            this.render();
        }
    }

    onPointerDown(e: MouseEvent) {console.log('down');
    
        // const pt = this.ctx.transformedPoint(e.offsetX, e.offsetY);
        // const hit = this.hitTest(this.scene, pt);
        // if (hit) {
        //     this.selected = hit;
        //     this.isDragging = true;
        //     this.dragStart = pt;
        //     this.pushHistory();
        // }
        // this.render();
    }

    onPointerMove(e: MouseEvent) {console.log('move');
    
        // if (this.isDragging && this.selected && this.currentTool === 'select') {
        //     const pt = this.ctx.transformedPoint(e.offsetX, e.offsetY);
        //     const dx = pt.x - this.dragStart.x;
        //     const dy = pt.y - this.dragStart.y;
        //     this.selected.x += dx;
        //     this.selected.y += dy;
        //     this.dragStart = pt;
        //     this.render();
        // }
    }

    onPointerUp(e: MouseEvent) {console.log('up');
    
        // this.isDragging = false;
        // this.selected = null;
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

    render() {
        if (!this.canvasKit || !this.surf || !this.skCnvs) return; 

        this.skCnvs.clear(this.canvasKit.TRANSPARENT);
        this.scene.updateWorldMatrix();

        this.skCnvs.drawRect(this.canvasKit.LTRBRect(10, 10, 100, 100), this.paint!);

        // this.renderNode(this.scene);
        this.surf.flush();
    }

    renderNode(node: SceneNode) {
        // Save canvas state
        // this.skCnvs!.save();
        
        // Apply node's world transform
        // if (node.worldMatrix) {
        //     const skMatrix = this.convertToSkiaMatrix(node.worldMatrix);
        //     this.skCnvs!.concat(skMatrix);
        // }
        
        // // Draw the shape if it exists
        // if (node.shape && typeof node.shape.draw === 'function') {
        //     node.shape.draw(this.skCnvs!, this.canvasKit!, this.paint!);
        // }
        
        // // Render children
        // for (const child of node.children) {
        //     this.renderNode(child);
        // }
        
        // // Restore canvas state
        // this.skCnvs!.restore();
    }

    convertToSkiaMatrix(matrix: Matrix) {
        // // Convert your Matrix to CanvasKit matrix format
        // const skMatrix = this.canvasKit!.Matrix.identity(); // Implement based on your Matrix class
        // // Apply conversion logic here using the 'matrix' parameter
        // return skMatrix;
    }
    removeEventListener() {
        if (!this.canvasEl) return;
        this.canvasEl.removeEventListener('mousedown', e => this.onPointerDown(e));
        this.canvasEl.removeEventListener('mousemove', e => this.onPointerMove(e));
        this.canvasEl.removeEventListener('mouseup', e => this.onPointerUp(e));
        window.removeEventListener('resize', e => this.resize(e));
    }   
}

export default CanvasManager;
