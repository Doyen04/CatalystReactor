import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/Tool'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/keyboardTool'
import { ToolType } from '@lib/tools/toolTypes'
import GroupTool from '@lib/tools/GroupTool'
import LineTool from '@lib/tools/LineTool'
import PenTool from '@lib/tools/PenTool'
import BezierTool from '@lib/tools/BezierTool'
import EditTool from '@lib/tools/EditTool'
import type InputManager from './InputManager'
import type { InputCallbacks } from './InputManager'
import { requestRender } from '@/engine/render/renderRequest'

class ToolManager {
    currentTool: Tool
    keyboardTool: KeyboardTool
    cnvsElm: HTMLCanvasElement
    inputManager: InputManager

    private inputCallbacks?: InputCallbacks

    constructor(cnvs: HTMLCanvasElement, inputManager: InputManager) {
        this.cnvsElm = cnvs
        this.inputManager = inputManager
        this.currentTool = new SelectTool(this.cnvsElm)
        this.keyboardTool = new KeyboardTool()
        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        let currentTool: Tool | null = null
        switch (tool) {
            case 'select':
                currentTool = new SelectTool(this.cnvsElm)
                break
            case 'rect':
            case 'oval':
            case 'star':
            case 'polygon':
            case 'text':
                currentTool = new ShapeTool(tool, this.cnvsElm)
                break
            case 'row':
            case 'column':
            case 'grid':
            case 'frame':
                currentTool = new GroupTool(tool, this.cnvsElm)
                break
            case 'img':
                currentTool = new ImageTool(this.cnvsElm)
                break
            case 'line':
                currentTool = new LineTool(this.cnvsElm)
                break
            case 'path':
                currentTool = new PenTool(this.cnvsElm)
                break
            case 'bezier':
                currentTool = new BezierTool(this.cnvsElm)
                break
            case 'edit':
                currentTool = new EditTool(this.cnvsElm)
                break
            default:
                console.warn('tool not implemented')
                currentTool = null
                break
        }
        if (currentTool) this.handleToolChange(currentTool)
        this.setUpEvent()
    }

    private handleToolChange = (tool: Tool) => {
        if (tool !== this.currentTool) {
            if (this.currentTool) this.currentTool.toolChange()
            this.currentTool = tool
        }
    }

    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }

    addEvent() {
        // Create an explicit callback object to subscribe directly to InputManager
        const boundToolKeyDown = this.currentTool.handleKeyDown.bind(this.currentTool)

        this.inputCallbacks = {
            onPointerDown: (e: MouseEvent) => {
                this.currentTool.handlePointerDown(e)
                requestRender()
            },
            onPointerMove: (e: MouseEvent) => {
                this.currentTool.handlePointerMove(e)
                requestRender()
            },
            onPointerUp: (e: MouseEvent) => {
                this.currentTool.handlePointerUp(e)
                requestRender()
            },
            onKeyDown: (e: KeyboardEvent) => {
                this.keyboardTool.handleKeyDown(e)
                // Forward to the current tool (PenTool, BezierTool, EditTool, etc.)
                boundToolKeyDown(e)
                requestRender()
            },
            onKeyUp: this.keyboardTool.handleKeyUp.bind(this.keyboardTool),
        }

        this.inputManager.subscribe(this.inputCallbacks)
    }

    removeEvent() {
        if (this.inputCallbacks) {
            this.inputManager.unsubscribe(this.inputCallbacks)
            this.inputCallbacks = undefined
        }
    }

    destroy() {
        this.removeEvent()
        this.currentTool = null
    }
}

export default ToolManager

