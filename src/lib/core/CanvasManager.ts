import InputManager from './InputManager'
import SceneManager from './SceneManager'
import Renderer from './Renderer'
import ToolManager from './ToolManager'
import ShapeManager from './ShapeManager'
import type ShapeModifier from '@lib/modifiers/ShapeModifier'
import { ToolType } from '@lib/tools/toolTypes'
import type PaintManager from './PaintManager'
import type SnapManager from './SnapManager'
import type { EngineBus } from '@/lib/engine/events/EngineBus'
import type { EngineEvents } from './EngineEvents'
import type { CommandManager } from '@/lib/engine/commands/CommandManager'
import type { DocumentModel } from '@/lib/engine/document/DocumentModel'

export interface CanvasDeps {
    doc: DocumentModel
    bus: EngineBus<EngineEvents>
    commandManager: CommandManager
    paintManager: PaintManager
    shapeModifier: ShapeModifier
    snap: SnapManager
}

class CanvasManager {
    inputManager: InputManager
    sceneManager: SceneManager
    renderer: Renderer
    toolManager: ToolManager
    shapeManager: ShapeManager
    shapeModifier: ShapeModifier
    paintManager: PaintManager
    commandManager: CommandManager
    bus: EngineBus<EngineEvents>
    private destroyed = false

    constructor(canvas: HTMLCanvasElement, deps: CanvasDeps) {
        // Phase 1: Core foundation (no dependencies)
        this.bus = deps.bus
        this.paintManager = deps.paintManager
        this.shapeModifier = deps.shapeModifier
        this.commandManager = deps.commandManager

        // Phase 2: Managers requiring explicit orchestration injection
        this.shapeManager = new ShapeManager(this.shapeModifier, this.bus, this.commandManager, deps.doc, deps.snap)

        this.sceneManager = new SceneManager(this.shapeModifier, this.shapeManager, deps.doc, deps.paintManager)

        this.inputManager = new InputManager(canvas)

        this.renderer = new Renderer(canvas, this.sceneManager, this.paintManager, this.inputManager)

        this.toolManager = new ToolManager(
            canvas,
            this.inputManager,
            this.bus,
            this.sceneManager,
            this.shapeManager,
            this.shapeModifier,
            this.commandManager,
            deps.doc
        )
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
        this.commandManager.undo()
    }

    redo() {
        this.commandManager.redo()
    }

    get canUndo(): boolean {
        return this.commandManager.canUndo
    }

    get canRedo(): boolean {
        return this.commandManager.canRedo
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
        if (this.destroyed) return
        this.destroyed = true
        console.log('removing all event and doing clean up')

        this.inputManager.destroy()
        this.renderer.destroy()
        this.sceneManager.destroy()
        this.toolManager.destroy()
        this.shapeManager.destroy()
        this.shapeModifier.destroy()
        this.bus.clear()
        this.paintManager.destroy()
    }

    render() {}
}

export default CanvasManager
