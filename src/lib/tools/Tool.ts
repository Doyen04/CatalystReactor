import { useToolStore } from '@hooks/useTool'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import { Coord } from '@lib/types/shapes'

abstract class Tool {
    sceneManager: SceneManager | null = null
    shapeManager: ShapeManager | null = null
    cnvsElm: HTMLCanvasElement

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        this.sceneManager = sceneManager
        this.shapeManager = shapeManager
        this.cnvsElm = cnvs
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

    handlePointerUp(coord: Coord, e: MouseEvent) {
        const { setDefaultTool } = useToolStore.getState()
        setDefaultTool()
    }

    handlePointerMove(dragStart: Coord, e: MouseEvent): void {}
    abstract handlePointerDrag(dragStart: Coord, e: MouseEvent): void
    abstract handlePointerDown(dragStart: Coord, e: MouseEvent): void

    toolChange(): void {
        console.log('tool changed')
    }
}

export default Tool
