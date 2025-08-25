import EventQueue from './EventQueue'

import InputManager from './InputManager'
import SceneManager from './SceneManager'
import Renderer from './Renderer'
import ToolManager from './ToolManager'

import { ToolType } from '@lib/types/shapeTypes'
import ShapeManager from './ShapeManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
// import ModifierManager from './ModifierManager';

class CanvasManager {
    inputManager: InputManager
    sceneManager: SceneManager
    renderer: Renderer
    toolManager: ToolManager
    shapeManager: ShapeManager
    shapeModifier: ShapeModifier

    undoStack: never[]
    redoStack: never[]

    constructor(canvas: HTMLCanvasElement) {
        // this.skCnvs = null
        this.shapeModifier = new ShapeModifier()
        this.shapeManager = new ShapeManager(this.shapeModifier)
        this.sceneManager = new SceneManager(this.shapeModifier)
        this.renderer = new Renderer(canvas, this.sceneManager)
        this.inputManager = new InputManager(canvas)
        this.toolManager = new ToolManager(this.sceneManager, this.shapeManager, canvas)

        // Input handling state
        this.undoStack = []
        this.redoStack = []

        EventQueue.getEventNames()
    }

    setTool(tool: string): void {
        this.toolManager.setCurrentTool(tool as ToolType)
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

    convertToSkiaMatrix() {
        // // Convert your Matrix to CanvasKit matrix format
        // const skMatrix = this.canvasKit!.Matrix.identity(); // Implement based on your Matrix class
        // // Apply conversion logic here using the 'matrix' parameter
        // return skMatrix;
    }
    destroy() {
        console.log('removing all event and doing clean up')

        if (this.inputManager) {
            this.inputManager.destroy()
            this.inputManager = null
        }
        if (this.renderer) {
            this.renderer.destroy()
            this.renderer = null
        }
        if (this.sceneManager) {
            this.sceneManager.destroy()
            this.sceneManager = null
        }
        if (this.toolManager) {
            this.toolManager.destroy()
            this.toolManager = null
        }
        EventQueue.removeAllEvent()
    }

    render() {}
}

export default CanvasManager
