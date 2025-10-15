import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/SelectTool'
import EventQueue, { EventTypes } from './EventQueue'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/keyboardTool'
import { ToolType } from '@lib/tools/toolTypes'
import GroupTool from '@lib/tools/GroupTool'

const { PointerDown, PointerMove, PointerUp, KeyDown, KeyUp, ToolChange } = EventTypes

class ToolManager {
    currentTool: Tool
    keyboardTool: KeyboardTool
    cnvsElm: HTMLCanvasElement

    constructor(cnvs: HTMLCanvasElement) {
        this.cnvsElm = cnvs
        this.currentTool = new SelectTool(this.cnvsElm)
        this.keyboardTool = new KeyboardTool()
        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        let currentTool = null
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
                console.warn('ttool not implemented')

                currentTool = null
                break
        }
        if (currentTool) EventQueue.trigger(ToolChange, currentTool)
        this.setUpEvent()
    }

    handleToolChange(tool: Tool) {
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
        EventQueue.subscribe(PointerDown, this.currentTool.handlePointerDown.bind(this.currentTool))
        EventQueue.subscribe(PointerMove, this.currentTool.handlePointerMove.bind(this.currentTool))
        EventQueue.subscribe(PointerUp, this.currentTool.handlePointerUp.bind(this.currentTool))
        EventQueue.subscribe(KeyDown, this.keyboardTool.handleKeyDown.bind(this.keyboardTool))
        EventQueue.subscribe(KeyUp, this.keyboardTool.handleKeyUp.bind(this.keyboardTool))
        EventQueue.subscribe(ToolChange, this.handleToolChange.bind(this))
    }
    removeEvent() {
        EventQueue.unSubscribeAll(PointerDown)
        EventQueue.unSubscribeAll(PointerMove)
        EventQueue.unSubscribeAll(PointerUp)
        EventQueue.unSubscribeAll(KeyDown)
        EventQueue.unSubscribeAll(KeyUp)
        EventQueue.unSubscribeAll(ToolChange)
    }
    destroy() {
        this.removeEvent()
        this.currentTool = null
    }
}

export default ToolManager
