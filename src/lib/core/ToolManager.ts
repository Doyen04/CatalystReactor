import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/Tool'
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

    // Store bound references so we can unsubscribe the exact same function
    private boundPointerDown: (e: MouseEvent) => void
    private boundPointerMove: (e: MouseEvent) => void
    private boundPointerUp: (e: MouseEvent) => void
    private boundKeyDown: (e: KeyboardEvent) => void
    private boundKeyUp: (e: KeyboardEvent) => void

    constructor(cnvs: HTMLCanvasElement) {
        this.cnvsElm = cnvs
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
        // Create and store bound references
        this.boundPointerDown = this.currentTool.handlePointerDown.bind(this.currentTool)
        this.boundPointerMove = this.currentTool.handlePointerMove.bind(this.currentTool)
        this.boundPointerUp = this.currentTool.handlePointerUp.bind(this.currentTool)
        this.boundKeyDown = this.keyboardTool.handleKeyDown.bind(this.keyboardTool)
        this.boundKeyUp = this.keyboardTool.handleKeyUp.bind(this.keyboardTool)

        EventQueue.subscribe(PointerDown, this.boundPointerDown)
        EventQueue.subscribe(PointerMove, this.boundPointerMove)
        EventQueue.subscribe(PointerUp, this.boundPointerUp)
        EventQueue.subscribe(KeyDown, this.boundKeyDown)
        EventQueue.subscribe(KeyUp, this.boundKeyUp)
        EventQueue.subscribe(ToolChange, this.handleToolChange)
    }

    removeEvent() {
        // Only remove our own handlers, not everyone else's
        if (this.boundPointerDown) EventQueue.unsubscribe(PointerDown, this.boundPointerDown)
        if (this.boundPointerMove) EventQueue.unsubscribe(PointerMove, this.boundPointerMove)
        if (this.boundPointerUp) EventQueue.unsubscribe(PointerUp, this.boundPointerUp)
        if (this.boundKeyDown) EventQueue.unsubscribe(KeyDown, this.boundKeyDown)
        if (this.boundKeyUp) EventQueue.unsubscribe(KeyUp, this.boundKeyUp)
        EventQueue.unsubscribe(ToolChange, this.handleToolChange)
    }

    destroy() {
        this.removeEvent()
        this.currentTool = null
    }
}

export default ToolManager

