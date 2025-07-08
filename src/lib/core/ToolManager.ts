import { SelectTool, ShapeTool, Tool } from '@/lib/tools'
import EventQueue, { EventTypes } from './EventQueue'

const { PointerDown, PointerMove, PointerUp, PointerDrag } = EventTypes

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
        }
        this.setUpEvent()
    }
    setUpEvent() {
        EventQueue.unSubscribeAll(PointerDown)
        EventQueue.unSubscribeAll(PointerDrag)
        EventQueue.unSubscribeAll(PointerMove)
        EventQueue.unSubscribeAll(PointerUp)

        EventQueue.subscribe(PointerDown, this.currentTool.handlePointerDown)
        EventQueue.subscribe(PointerDrag, this.currentTool.handlePointerDrag)
        EventQueue.subscribe(PointerMove, this.currentTool.handlePointerMove)
        EventQueue.subscribe(PointerUp, this.currentTool.handlePointerUp)
    }
}

export default ToolManager;