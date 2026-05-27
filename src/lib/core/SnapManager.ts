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

export interface SnapResult {
    snapped: boolean
    x: number
    y: number
    guides: { x?: number; y?: number }[]
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
     */
    snap(targetX: number, targetY: number, nodes: SceneNode[], excludeId?: string): SnapResult {
        let bestX = targetX
        let bestY = targetY
        let snappedX = false
        let snappedY = false
        const guides: { x?: number; y?: number }[] = []

        // 1. Grid Snapping
        if (this.enableGrid) {
            const gridX = Math.round(targetX / this.gridSize) * this.gridSize
            const gridY = Math.round(targetY / this.gridSize) * this.gridSize

            if (Math.abs(targetX - gridX) <= this.snapDistance) {
                bestX = gridX
                snappedX = true
                guides.push({ x: gridX })
            }
            if (Math.abs(targetY - gridY) <= this.snapDistance) {
                bestY = gridY
                snappedY = true
                guides.push({ y: gridY })
            }
        }

        // 2. Shape Snapping (only if not snapped fully to grid or if closer)
        if (this.enableShapes) {
            for (const node of nodes) {
                if (node.id === excludeId) continue
                
                const snapPoints = this.getNodesSnapPoints(node)
                for (const pt of snapPoints) {
                    // Check X
                    if (!snappedX || Math.abs(targetX - pt.x) < Math.abs(targetX - bestX)) {
                        if (Math.abs(targetX - pt.x) <= this.snapDistance) {
                            bestX = pt.x
                            snappedX = true
                            // Update or add guide
                            const existing = guides.find(g => g.x !== undefined)
                            if (existing) existing.x = pt.x
                            else guides.push({ x: pt.x })
                        }
                    }

                    // Check Y
                    if (!snappedY || Math.abs(targetY - pt.y) < Math.abs(targetY - bestY)) {
                        if (Math.abs(targetY - pt.y) <= this.snapDistance) {
                            bestY = pt.y
                            snappedY = true
                            const existing = guides.find(g => g.y !== undefined)
                            if (existing) existing.y = pt.y
                            else guides.push({ y: pt.y })
                        }
                    }
                }
            }
        }

        return {
            snapped: snappedX || snappedY,
            x: bestX,
            y: bestY,
            guides
        }
    }

    private getNodesSnapPoints(node: SceneNode): SnapPoint[] {
        const props = node.getProperties()
        if (!props) return []

        const { x, y } = props.transform
        const { width, height } = props.size
        const id = node.id

        return [
            { x, y, type: 'corner', sourceId: id }, // Top-left
            { x: x + width, y, type: 'corner', sourceId: id }, // Top-right
            { x, y: y + height, type: 'corner', sourceId: id }, // Bottom-left
            { x: x + width, y: y + height, type: 'corner', sourceId: id }, // Bottom-right
            { x: x + width / 2, y: y + height / 2, type: 'center', sourceId: id }, // Center
            { x: x + width / 2, y, type: 'edge', sourceId: id }, // Top-mid
            { x: x + width / 2, y: y + height, type: 'edge', sourceId: id }, // Bottom-mid
            { x, y: y + height / 2, type: 'edge', sourceId: id }, // Left-mid
            { x: x + width, y: y + height / 2, type: 'edge', sourceId: id } // Right-mid
        ]
    }
}
