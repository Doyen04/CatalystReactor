import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/SelectTool'
import EventQueue, { EventTypes } from './EventQueue'
import { ToolType } from '@lib/types/shapeTypes'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/KeyboardTool'

const { PointerDown, PointerMove, PointerUp, PointerDrag, KeyDown, KeyUp, ToolChange } = EventTypes

class ToolManager {
    currentTool: Tool
    keyboardTool: KeyboardTool;
    constructor() {
        this.currentTool = new SelectTool()
        this.keyboardTool = new KeyboardTool(this.currentTool)
        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        let currentTool = null
        switch (tool) {
            case 'select':
                currentTool = new SelectTool()
                break;
            case 'rect':
                currentTool = new ShapeTool('rect')
                break;
            case 'oval':
                currentTool = new ShapeTool('oval')
                break;
            case 'star':
                currentTool = new ShapeTool('star')
                break;
            case 'polygon':
                currentTool = new ShapeTool('polygon')
                break;
            case 'text':
                currentTool = new ShapeTool('text')
                break;
            case 'img':
                currentTool = new ImageTool()
                break;
            default:
                console.log('ttool not implemented');

                currentTool = null
                break;
        }
        if (currentTool) EventQueue.trigger(ToolChange, currentTool)
        this.setUpEvent()
    }
    handleToolChange(tool: any) {
        if (tool !== this.currentTool) {
            if (this.currentTool) this.currentTool.toolChange()
            this.currentTool = tool
            this.keyboardTool.setCurrentTool(tool)
        }
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    addEvent() {
        console.log(this.currentTool);

        EventQueue.subscribe(PointerDown, this.currentTool.handlePointerDown.bind(this.currentTool))
        EventQueue.subscribe(PointerDrag, this.currentTool.handlePointerDrag.bind(this.currentTool))
        EventQueue.subscribe(PointerMove, this.currentTool.handlePointerMove.bind(this.currentTool))
        EventQueue.subscribe(PointerUp, this.currentTool.handlePointerUp.bind(this.currentTool))
        EventQueue.subscribe(KeyDown, this.keyboardTool.handleKeyDown.bind(this.keyboardTool))
        EventQueue.subscribe(KeyUp, this.keyboardTool.handleKeyUp.bind(this.keyboardTool))
        EventQueue.subscribe(ToolChange, this.handleToolChange.bind(this))

    }
    removeEvent() {
        EventQueue.unSubscribeAll(PointerDown)
        EventQueue.unSubscribeAll(PointerDrag)
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

export default ToolManager;