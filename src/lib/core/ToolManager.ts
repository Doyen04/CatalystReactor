import {SelectTool, Tool} from '@/lib/tools'

class ToolManager{
    currentTool: Tool

    constructor(){
        this.currentTool = new SelectTool()
    }

    setCurrentTool(tool: ToolType){
        switch(tool){
            case tool.Select:
                break;
            case tool.Rect:
                break;
            case tool.Oval:
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