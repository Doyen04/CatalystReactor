import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/SelectTool'
import EventQueue, { EventTypes } from './EventQueue'
import { ToolType } from '@lib/types/shapeTypes'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/keyboardTool'
import SceneManager from './SceneManager'
import ShapeManager from './ShapeManager'

const { PointerDown, PointerMove, PointerUp, PointerDrag, KeyDown, KeyUp, ToolChange } = EventTypes

class ToolManager {
    currentTool: Tool
    keyboardTool: KeyboardTool;
    sceneManager: SceneManager;
    shapeManager: ShapeManager;
    cnvsElm: HTMLCanvasElement

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        this.sceneManager = sceneManager
        this.shapeManager = shapeManager
        this.cnvsElm = cnvs
        this.currentTool = new SelectTool(this.sceneManager, this.shapeManager, this.cnvsElm)
        this.keyboardTool = new KeyboardTool(this.shapeManager)
        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        let currentTool = null
        switch (tool) {
            case 'select':
                currentTool = new SelectTool(this.sceneManager, this.shapeManager, this.cnvsElm )
                break;
            case 'rect':
                currentTool = new ShapeTool('rect', this.sceneManager, this.shapeManager )
                break;
            case 'oval':
                currentTool = new ShapeTool('oval', this.sceneManager, this.shapeManager )
                break;
            case 'star':
                currentTool = new ShapeTool('star', this.sceneManager, this.shapeManager )
                break;
            case 'polygon':
                currentTool = new ShapeTool('polygon', this.sceneManager, this.shapeManager )
                break;
            case 'text':
                currentTool = new ShapeTool('text', this.sceneManager, this.shapeManager )
                break;
            case 'img':
                currentTool = new ImageTool(this.sceneManager, this.shapeManager )
                break;
            default:
                console.log('ttool not implemented');

                currentTool = null
                break;
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