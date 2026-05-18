import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/Tool'
import EventQueue, { EventTypes } from './EventQueue'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/keyboardTool'
import { ToolType } from '@lib/tools/toolTypes'
import GroupTool from '@lib/tools/GroupTool'
import type InputManager from './InputManager'
import type { InputCallbacks } from './InputManager'

const { ToolChange } = EventTypes

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
            default:
                console.warn('tool not implemented')
                currentTool = null
                break
        }
        if (currentTool) EventQueue.trigger(ToolChange, currentTool)
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
        this.inputCallbacks = {
            onPointerDown: this.currentTool.handlePointerDown.bind(this.currentTool),
            onPointerMove: this.currentTool.handlePointerMove.bind(this.currentTool),
            onPointerUp: this.currentTool.handlePointerUp.bind(this.currentTool),
            onKeyDown: this.keyboardTool.handleKeyDown.bind(this.keyboardTool),
            onKeyUp: this.keyboardTool.handleKeyUp.bind(this.keyboardTool),
        }

        this.inputManager.subscribe(this.inputCallbacks)
        EventQueue.subscribe(ToolChange, this.handleToolChange)
    }

    removeEvent() {
        if (this.inputCallbacks) {
            this.inputManager.unsubscribe(this.inputCallbacks)
            this.inputCallbacks = undefined
        }
        EventQueue.unsubscribe(ToolChange, this.handleToolChange)
    }

    destroy() {
        this.removeEvent()
        this.currentTool = null
    }
}

export default ToolManager

