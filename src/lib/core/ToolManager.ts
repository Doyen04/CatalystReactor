import { SelectTool, RectTool, Tool, OvalTool } from '@/lib/tools'
import { EventQueue, EventTypes } from '@/lib/core'

const { PointerDown, PointerMove, PointerUp } = EventTypes

class ToolManager {
    currentTool: Tool

    constructor() {
        this.currentTool = new SelectTool()

        EventQueue.subscribe(PointerDown, this.currentTool.handlePointerDown)
        EventQueue.subscribe(PointerMove, this.currentTool.handlePointerMove)
        EventQueue.subscribe(PointerUp, this.currentTool.handlePointerUp)
    }

    setCurrentTool(tool: ToolType) {
        switch (tool) {
            case ToolType.Select:
                this.currentTool = new SelectTool()
                break;
            case ToolType.Rect:
                this.currentTool = new RectTool()
                break;
            case ToolType.Oval:
                this.currentTool = new OvalTool
                break;
        }
    }
}

export default ToolManager;