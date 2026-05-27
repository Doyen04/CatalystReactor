import { Coord, BoundingRect } from '@lib/types/shapes'
import Shape from '../shapes/base/Shape'
import SceneNode from '../node/Scene'
import ShapeNode from '../node/ShapeNode'

export interface SnapPoint {
    x: number
    y: number
    type: 'corner' | 'edge' | 'center' | 'grid'
    sourceId?: string
}

export interface SnapGuide {
    pos: number
    orientation: 'horizontal' | 'vertical'
    isGrid: boolean
    type: SnapPoint['type']
}

export interface SnapResult {
    snapped: boolean
    x: number
    y: number
    guides: SnapGuide[]
    indicators: SnapPoint[]
}

export class SnapManager {
    private static instance: SnapManager
    private snapDistance: number = 8 // pixels
    private gridSize: number = 10
    private enableGrid: boolean = true
    private enableShapes: boolean = true

    private constructor() {}

    public static getInstance(): SnapManager {
        if (!SnapManager.instance) {
            SnapManager.instance = new SnapManager()
        }
        return SnapManager.instance
    }

    setConfiguration(config: { gridSize?: number, enableGrid?: boolean, enableShapes?: boolean, snapDistance?: number }) {
        if (config.gridSize !== undefined) this.gridSize = config.gridSize
        if (config.enableGrid !== undefined) this.enableGrid = config.enableGrid
        if (config.enableShapes !== undefined) this.enableShapes = config.enableShapes
        if (config.snapDistance !== undefined) this.snapDistance = config.snapDistance
    }

    /**
     * Finds the best snap position for a target coordinate given a set of shapes.
     * targetPos should be in world/screen space (e.g. e.offsetX, e.offsetY).
     */
    getSnapResult(targetNode: SceneNode, targetPos: Coord, gridSize: number = 10): SnapResult {
        this.gridSize = gridSize
        const targetX = targetPos.x
        const targetY = targetPos.y
        const nodes = targetNode.getParent()?.getChildren() || []
        const excludeId = targetNode.id

        let bestX = targetX
        let bestY = targetY
        let snappedX = false
        let snappedY = false
        const guides: SnapGuide[] = []
        const indicators: SnapPoint[] = []

        // 1. Grid Snapping
        if (this.enableGrid) {
            const gridX = Math.round(targetX / this.gridSize) * this.gridSize
            const gridY = Math.round(targetY / this.gridSize) * this.gridSize

            if (Math.abs(targetX - gridX) <= this.snapDistance) {
                bestX = gridX
                snappedX = true
                guides.push({ pos: gridX, orientation: 'vertical', isGrid: true, type: 'grid' })
            }
            if (Math.abs(targetY - gridY) <= this.snapDistance) {
                bestY = gridY
                snappedY = true
                guides.push({ pos: gridY, orientation: 'horizontal', isGrid: true, type: 'grid' })
            }
        }

        // 2. Shape Snapping
        if (this.enableShapes) {
            for (const node of nodes) {
                if (node.id === excludeId) continue
                
                const snapPoints = this.getNodesSnapPoints(node)
                for (const pt of snapPoints) {
                    const distH = Math.abs(targetX - pt.x)
                    const distV = Math.abs(targetY - pt.y)

                    // Collect all available snap points as indicators
                    if (distH <= this.snapDistance || distV <= this.snapDistance) {
                        indicators.push(pt)
                    }

                    // Check X for actual coordinate snapping (best match)
                    if (distH <= this.snapDistance) {
                        if (!snappedX || distH < Math.abs(targetX - bestX)) {
                            bestX = pt.x
                            snappedX = true
                            // For actual snapping, we keep the line guides
                            const index = guides.findIndex(g => g.orientation === 'vertical')
                            const guide: SnapGuide = { pos: pt.x, orientation: 'vertical', isGrid: false, type: pt.type }
                            if (index !== -1) guides[index] = guide
                            else guides.push(guide)
                        }
                    }

                    // Check Y for actual coordinate snapping (best match)
                    if (distV <= this.snapDistance) {
                        if (!snappedY || distV < Math.abs(targetY - bestY)) {
                            bestY = pt.y
                            snappedY = true
                            const index = guides.findIndex(g => g.orientation === 'horizontal')
                            const guide: SnapGuide = { pos: pt.y, orientation: 'horizontal', isGrid: false, type: pt.type }
                            if (index !== -1) guides[index] = guide
                            else guides.push(guide)
                        }
                    }
                }
            }
        }

        return {
            snapped: snappedX || snappedY,
            x: bestX,
            y: bestY,
            guides,
            indicators
        }
    }

    /**
     * Get snap points for a node in WORLD space.
     * Transforms the node's local bounding box corners/edges/center through
     * the node's world matrix so they can be compared against world-space mouse coords.
     */
    private getNodesSnapPoints(node: SceneNode): SnapPoint[] {
        const props = node.getProperties()
        if (!props) return []

        const { width, height } = props.size
        const id = node.id

        // Generate points in the node's local space (origin at 0,0)
        // then transform to world space via node.localToWorld()
        const localPoints: { lx: number, ly: number, type: SnapPoint['type'] }[] = [
            { lx: 0, ly: 0, type: 'corner' },              // Top-left
            { lx: width, ly: 0, type: 'corner' },           // Top-right
            { lx: 0, ly: height, type: 'corner' },          // Bottom-left
            { lx: width, ly: height, type: 'corner' },      // Bottom-right
            { lx: width / 2, ly: height / 2, type: 'center' }, // Center
            { lx: width / 2, ly: 0, type: 'edge' },         // Top-mid
            { lx: width / 2, ly: height, type: 'edge' },    // Bottom-mid
            { lx: 0, ly: height / 2, type: 'edge' },        // Left-mid
            { lx: width, ly: height / 2, type: 'edge' },    // Right-mid
        ]

        return localPoints.map(p => {
            const world = node.localToWorld(p.lx, p.ly)
            return { x: world.x, y: world.y, type: p.type, sourceId: id }
        })
    }
}

export default SnapManager

