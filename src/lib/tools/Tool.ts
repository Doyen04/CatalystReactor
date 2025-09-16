import { useToolStore } from '@hooks/useTool'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import { Coord } from '@lib/types/shapes'

abstract class Tool {
    sceneManager: SceneManager | null = null
    shapeManager: ShapeManager | null = null
    cnvsElm: HTMLCanvasElement
    protected isPointerDown: boolean
    protected isDragging: boolean
    protected dragStart: Coord

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        this.sceneManager = sceneManager
        this.shapeManager = shapeManager
        this.cnvsElm = cnvs
        this.isPointerDown = false
        this.isDragging = false
        this.dragStart = null
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }

    handlePointerUp(e: MouseEvent) {
        const { setDefaultTool } = useToolStore.getState()
        setDefaultTool()
        this.isPointerDown = false
        this.dragStart = null
        this.isDragging = false
    }

    abstract handlePointerMove(e: MouseEvent): void 
    abstract handlePointerDrag(e: MouseEvent): void

    handlePointerDown(e: MouseEvent): void {
        this.dragStart = { x: e.offsetX, y: e.offsetY }
        this.isPointerDown = true
        this.isDragging = false
    }

    toolChange(): void {
        console.log('tool changed')
    }
}

export default Tool
