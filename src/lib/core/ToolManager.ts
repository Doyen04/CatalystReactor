import { SelectTool, ShapeTool, TextTool, Tool } from '@/lib/tools'
import EventQueue, { EventTypes } from './EventQueue'

const { PointerDown, PointerMove, PointerUp, PointerDrag, KeyDown, KeyUp } = EventTypes

class ToolManager {
    currentTool: Tool

    constructor() {
        this.currentTool = new SelectTool()

        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        switch (tool) {
            case 'select':
                this.currentTool = new SelectTool()
                break;
            case 'rect':
                this.currentTool = new ShapeTool('rect')
                break;
            case 'oval':
                this.currentTool = new ShapeTool('oval')
                break;
            case 'star':
                this.currentTool = new ShapeTool('star')
                break;
            case 'polygon':
                this.currentTool = new ShapeTool('polygon')
                break;
            case 'text':
                this.currentTool = new TextTool()
                break;
            default:
                console.log('ttool not implemented');

                this.currentTool = null
                break;
        }
        this.setUpEvent()
    }
    setUpEvent() {
        EventQueue.unSubscribeAll(PointerDown)
        EventQueue.unSubscribeAll(PointerDrag)
        EventQueue.unSubscribeAll(PointerMove)
        EventQueue.unSubscribeAll(PointerUp)
        EventQueue.unSubscribeAll(KeyDown)
        EventQueue.unSubscribeAll(KeyUp)

        EventQueue.subscribe(PointerDown, this.currentTool.handlePointerDown.bind(this.currentTool))
        EventQueue.subscribe(PointerDrag, this.currentTool.handlePointerDrag.bind(this.currentTool))
        EventQueue.subscribe(PointerMove, this.currentTool.handlePointerMove.bind(this.currentTool))
        EventQueue.subscribe(PointerUp, this.currentTool.handlePointerUp.bind(this.currentTool))
        EventQueue.subscribe(KeyDown, this.currentTool.handleKeyDown.bind(this.currentTool))
        EventQueue.subscribe(KeyUp, this.currentTool.handleKeyUp.bind(this.currentTool))
    }
}

export default ToolManager;