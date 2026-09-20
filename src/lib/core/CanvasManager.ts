import InputManager from './InputManager'
import SceneManager from './SceneManager'
import Renderer from './Renderer'
import ToolManager from './ToolManager'
import ShapeManager from './ShapeManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import { ToolType } from '@lib/tools/toolTypes'
import PaintManager from './PaintManager'
import container from './DependencyManager'
import { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from './EngineEvents'

class CanvasManager {
    inputManager: InputManager
    sceneManager: SceneManager
    renderer: Renderer
    toolManager: ToolManager
    shapeManager: ShapeManager
    shapeModifier: ShapeModifier | null
    paintManager: PaintManager
    bus: EngineBus<EngineEvents>

    undoStack: never[]
    redoStack: never[]

    constructor(canvas: HTMLCanvasElement) {
        // Phase 1: Create instances that have no container dependencies
        // Phase 1: Core foundation (no dependencies)
        this.bus = new EngineBus<EngineEvents>()

        this.paintManager = new PaintManager()
        container.register('paintManager', this.paintManager)

        this.shapeModifier = new ShapeModifier()
        container.register('shapeModifier', this.shapeModifier)

        // Phase 2: Managers requiring explicit orchestration injection
        this.shapeManager = new ShapeManager(this.shapeModifier, this.bus)
        container.register('shapeManager', this.shapeManager)

        this.sceneManager = new SceneManager(this.shapeModifier, this.shapeManager)
        container.register('sceneManager', this.sceneManager)

        this.inputManager = new InputManager(canvas)
        container.register('inputManager', this.inputManager)

        this.renderer = new Renderer(canvas, this.sceneManager, this.paintManager, this.inputManager)
        container.register('renderer', this.renderer)

        this.toolManager = new ToolManager(canvas, this.inputManager, this.bus)
        container.register('toolManager', this.toolManager)

        this.undoStack = []
        this.redoStack = []
    }

    setTool(tool: string): void {
        this.toolManager.setCurrentTool(tool as ToolType)
    }

    setGridSize(size: number): void {
        this.shapeManager.setGridSize(size)
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
        if (this.shapeManager) {
            this.shapeManager.destroy()
            this.shapeManager = null
        }
        if (this.shapeModifier) {
            this.shapeModifier.destroy()
            this.shapeModifier = null
        }
        container.clear()
        this.bus.clear()
        this.bus = null
        if (this.paintManager) {
            this.paintManager.destroy()
            this.paintManager = null
        }
    }

    render() { }
}

export default CanvasManager
