import {SelectTool, RectTool, Tool, OvalTool} from '@/lib/tools'

class ToolManager{
    currentTool: Tool

    constructor(){
        this.currentTool = new SelectTool()
    }

    setCurrentTool(tool: ToolType){
        switch(tool){
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
    handlePointerUp(){

    }
    handlePointerDown(){

    }
    handlePointerMove(){

    }
}

export default ToolManager;