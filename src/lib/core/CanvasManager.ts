import type { CanvasKit } from "canvaskit-wasm";
import  EventQueue  from './EventQueue';
import InputManager from "./InputManger";
import SceneManager from "./SceneManager";
import Renderer from "./Renderer";
import ToolManager from "./ToolManager";

import type { Matrix } from "@/lib/core";


class CanvasManager {
    inputManager: InputManager;
    sceneManager: SceneManager;
    renderer: Renderer;
    toolManager: ToolManager;

    undoStack: never[];
    redoStack: never[];

    constructor(canvas: HTMLCanvasElement, canvasKit: CanvasKit) {

        // this.skCnvs = null;
        this.sceneManager = new SceneManager();
        this.renderer = new Renderer(canvasKit, canvas, this.sceneManager)
        this.inputManager = new InputManager(canvas)
        this.toolManager = new ToolManager()

        // Input handling state
        this.undoStack = [];
        this.redoStack = [];

        EventQueue.getEventNames()
    }

    setTool(tool: string): void {
        console.log(tool);
        
        this.toolManager.setCurrentTool(tool as ToolType);
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

    convertToSkiaMatrix(matrix: Matrix) {
        // // Convert your Matrix to CanvasKit matrix format
        // const skMatrix = this.canvasKit!.Matrix.identity(); // Implement based on your Matrix class
        // // Apply conversion logic here using the 'matrix' parameter
        // return skMatrix;
    }
    removeEventListener() {
        this.inputManager.removeEventListeners()
        this.renderer.destroy()
        EventQueue.removeAllEvent()
    }

    render(){

    }
}


export default CanvasManager;
