import { useToolStore } from '@hooks/useTool'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import container from '@lib/core/DependencyManager'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import { Coord } from '@lib/types/shapes'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'

abstract class Tool {
    sceneManager: SceneManager | null = null
    shapeManager: ShapeManager | null = null
    cnvsElm: HTMLCanvasElement
    protected isPointerDown: boolean
    protected isDragging: boolean
    protected dragStart: Coord

    constructor(cnvs: HTMLCanvasElement) {
        this.sceneManager = container.resolve('sceneManager')
        this.shapeManager = container.resolve('shapeManager')
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
    resetPointerData() {
        this.isPointerDown = false
        this.isDragging = false
        this.dragStart = null
    }

    abstract handlePointerMove(e: MouseEvent): void 

    handlePointerDown(e: MouseEvent): void {
        this.dragStart = { x: e.offsetX, y: e.offsetY }
        this.isPointerDown = true
        this.isDragging = false
    }

    toolChange(): void {
        console.log('tool changed')
    }

    // Optional keyboard handler — override in tools that need keyboard input
    handleKeyDown(_e: KeyboardEvent): void { /* no-op */ }

    protected findSnapPoint(e: MouseEvent, excludeShape?: VectorPath): { x: number, y: number, shape: VectorPath, index: number } | null {
        if (!this.sceneManager) return null

        const SNAP_THRESHOLD = 12
        const root = this.sceneManager.getRootContainer()
        if (!root) return null

        const snapPoints: { x: number, y: number, shape: VectorPath, index: number }[] = []

        const collectPoints = (node: SceneNode) => {
            if (node instanceof ShapeNode && node.shape instanceof VectorPath) {
                const shape = node.shape
                const pts = shape.points
                
                for (let i = 0; i < pts.length; i++) {
                    // Skip if it's the excludeShape AND it's the point being actively edited? 
                    // Actually, for simplicity we allow snapping to all nodes except the very last one 
                    // if it's the current shape (though that's usually where the mouse is).
                    
                    if (shape === excludeShape && i === pts.length - 1 && pts.length > 1) continue

                    const worldPt = node.localToWorld(pts[i].x, pts[i].y)
                    snapPoints.push({ x: worldPt.x, y: worldPt.y, shape, index: i })
                }
            }
            node.getChildren().forEach(collectPoints)
        }

        collectPoints(root)

        let bestDist = SNAP_THRESHOLD
        let bestSnap: { x: number, y: number, shape: VectorPath, index: number } | null = null

        for (const snap of snapPoints) {
            const dx = e.offsetX - snap.x
            const dy = e.offsetY - snap.y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < bestDist) {
                bestDist = d
                bestSnap = snap
            }
        }

        return bestSnap
    }
}

export default Tool
