import SelectTool from '@/lib/tools/SelectTool'
import ShapeTool from '@/lib/tools/ShapeTool'
import Tool from '@/lib/tools/Tool'
import ImageTool from '@lib/tools/ImageTool'
import KeyboardTool from '@lib/tools/keyboardTool'
import { ToolType } from '@lib/tools/toolTypes'
import GroupTool from '@lib/tools/GroupTool'
import LineTool from '@lib/tools/LineTool'
import PenTool from '@lib/tools/PenTool'
import BezierTool from '@lib/tools/BezierTool'
import EditTool from '@lib/tools/EditTool'
import type InputManager from './InputManager'
import type { InputCallbacks } from './InputManager'
import { requestRender } from '@/engine/render/renderRequest'
import type { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from './EngineEvents'
import type { ToolContext } from '@lib/tools/ToolContext'
import container from './DependencyManager'

class ToolManager {
    currentTool: Tool
    keyboardTool: KeyboardTool
    cnvsElm: HTMLCanvasElement
    inputManager: InputManager
    bus: EngineBus<EngineEvents>
    private ctx: ToolContext
    private currentToolType: ToolType | null = null

    private inputCallbacks?: InputCallbacks

    constructor(cnvs: HTMLCanvasElement, inputManager: InputManager, bus: EngineBus<EngineEvents>) {
        this.cnvsElm = cnvs
        this.inputManager = inputManager
        this.bus = bus
        const sceneManager = container.resolve('sceneManager')
        const shapeManager = container.resolve('shapeManager')
        const shapeModifier = container.resolve('shapeModifier')
        this.ctx = {
            defaultTool: 'select',
            sceneManager,
            shapeManager,
            shapeModifier,
            setTool: (tool: ToolType) => {
                this.setCurrentTool(tool)
                this.bus.emit('tool:changed', { tool })
            },
            setCursor: (cursor: string) => {
                this.cnvsElm.style.cursor = cursor
            },
            requestRender,
        }
        this.currentToolType = 'select'
        this.currentTool = new SelectTool(this.cnvsElm, this.ctx)
        this.keyboardTool = new KeyboardTool(this.ctx.shapeManager)
        this.setUpEvent()
    }

    setCurrentTool(tool: ToolType) {
        if (this.currentToolType === tool && this.currentTool) return
        let currentTool: Tool | null = null
        switch (tool) {
            case 'select':
                currentTool = new SelectTool(this.cnvsElm, this.ctx)
                break
            case 'rect':
            case 'oval':
            case 'star':
            case 'polygon':
            case 'text':
                currentTool = new ShapeTool(tool, this.cnvsElm, this.ctx)
                break
            case 'row':
            case 'column':
            case 'grid':
            case 'frame':
                currentTool = new GroupTool(tool, this.cnvsElm, this.ctx)
                break
            case 'img':
                currentTool = new ImageTool(this.cnvsElm, this.ctx)
                break
            case 'line':
                currentTool = new LineTool(this.cnvsElm, this.ctx)
                break
            case 'path':
                currentTool = new PenTool(this.cnvsElm, this.ctx)
                break
            case 'bezier':
                currentTool = new BezierTool(this.cnvsElm, this.ctx)
                break
            case 'edit':
                currentTool = new EditTool(this.cnvsElm, this.ctx)
                break
            default:
                console.warn('tool not implemented')
                currentTool = null
                break
        }
        if (currentTool) {
            this.handleToolChange(currentTool)
            this.currentToolType = tool
        }
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
        const boundToolKeyDown = this.currentTool.handleKeyDown.bind(this.currentTool)

        this.inputCallbacks = {
            onPointerDown: (e: MouseEvent) => {
                this.currentTool.handlePointerDown(e)
                requestRender()
            },
            onPointerMove: (e: MouseEvent) => {
                this.currentTool.handlePointerMove(e)
                requestRender()
            },
            onPointerUp: (e: MouseEvent) => {
                this.currentTool.handlePointerUp(e)
                requestRender()
            },
            onKeyDown: (e: KeyboardEvent) => {
                this.keyboardTool.handleKeyDown(e)
                // Forward to the current tool (PenTool, BezierTool, EditTool, etc.)
                boundToolKeyDown(e)
                requestRender()
            },
            onKeyUp: this.keyboardTool.handleKeyUp.bind(this.keyboardTool),
        }

        this.inputManager.subscribe(this.inputCallbacks)
    }

    removeEvent() {
        if (this.inputCallbacks) {
            this.inputManager.unsubscribe(this.inputCallbacks)
            this.inputCallbacks = undefined
        }
    }

    destroy() {
        this.removeEvent()
        this.currentTool = null
    }
}

export default ToolManager
