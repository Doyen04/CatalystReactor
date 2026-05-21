import Tool from './Tool'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import SceneNode from '@lib/node/Scene'
import ShapeNode from '@lib/node/ShapeNode'
import container from '@lib/core/DependencyManager'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'

type EditState = 'idle' | 'dragging-anchor' | 'dragging-control'
type DragTarget = {
    type: 'anchor'
    index: number
} | {
    type: 'control'
    index: number
    which: 'cp1' | 'cp2'
} | {
    type: 'segment'
    index: number
} | null

class EditTool extends Tool {
    private editingNode: SceneNode | null = null
    private editingShape: VectorPath | null = null
    private state: EditState = 'idle'
    private dragTarget: DragTarget = null
    private clickCount: number = 0
    private lastClickTime: number = 0
    private doubleClickDelay: number = 300
    private shapeModifier: ShapeModifier | null = null
    private lastLocalPos: { x: number; y: number } | null = null
    private lastWorldPos: { x: number; y: number } | null = null

    constructor(cnvs: HTMLCanvasElement) {
        super(cnvs)
        this.shapeModifier = container.resolve('shapeModifier')
    }

    private getActiveVectorPath(): VectorPath | null {
        const scene = this.shapeManager.currentScene
        if (!scene) return null
        if (scene instanceof ShapeNode && scene.shape instanceof VectorPath) {
            return scene.shape
        }
        return null
    }

    override handlePointerDown(e: MouseEvent): void {
        super.handlePointerDown(e)
        this.lastWorldPos = { x: e.offsetX, y: e.offsetY }

        // Handle double-click detection
        const now = Date.now()
        if (now - this.lastClickTime < this.doubleClickDelay) {
            this.clickCount++
        } else {
            this.clickCount = 1
        }
        this.lastClickTime = now

        // If we have an active vector path in edit mode
        if (this.editingShape) {
            const { x, y } = this.editingNode
                ? this.editingNode.worldToLocal(e.offsetX, e.offsetY)
                : { x: e.offsetX, y: e.offsetY }

            // Check for control point hit first (they're smaller targets on top of anchors)
            const cpHit = this.editingShape.findClosestControlPoint(x, y)
            if (cpHit) {
                this.state = 'dragging-control'
                this.dragTarget = { type: 'control', index: cpHit.index, which: cpHit.which }
                return
            }

            // Check for anchor point hit
            const ptIdx = this.editingShape.findClosestPoint(x, y)
            if (ptIdx >= 0) {
                this.editingShape.selectedPointIndex = ptIdx

                // Double-click toggles smooth/corner
                if (this.clickCount >= 2) {
                    this.editingShape.toggleSmooth(ptIdx)
                    this.clickCount = 0
                    return
                }

                this.state = 'dragging-anchor'
                this.dragTarget = { type: 'anchor', index: ptIdx }
                return
            }

            // Check for segment hit (insert point ONLY on double click)
            const segIdx = this.editingShape.findClosestSegment(x, y)
            if (segIdx >= 0) {
                if (this.clickCount >= 2) {
                    this.clickCount = 0
                    this.editingShape.insertPoint(segIdx, { x, y })
                    this.editingShape.selectedPointIndex = segIdx
                    this.state = 'dragging-anchor'
                    this.dragTarget = { type: 'anchor', index: segIdx }
                    return
                }
                
                // Single click on segment — allow dragging the segment (moves both points)
                this.state = 'idle'
                this.dragTarget = { type: 'segment', index: segIdx }
                this.lastLocalPos = { x, y }
                this.lastWorldPos = { x: e.offsetX, y: e.offsetY }
                this.editingShape.selectedSegmentIndex = segIdx
                this.editingShape.selectedPointIndex = -1
                return
            }

            // If we hit the shape but not a specific handle/segment
            if (this.editingShape.pointInShape(x, y)) {
                this.editingShape.selectedSegmentIndex = -1
                this.editingShape.selectedPointIndex = -1
                this.lastWorldPos = { x: e.offsetX, y: e.offsetY }
                return
            }

            // Clicked outside the path — exit edit mode
            this.exitEditMode()

            // Try selecting another shape
            const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)
            if (scene) {
                this.shapeManager.attachNode(scene)
                this.tryEnterEditMode()
            }
            return
        }

        // Not in edit mode — try to select and enter edit mode
        const scene = this.sceneManager.getCollidedScene(e.offsetX, e.offsetY)

        if (scene) {
            const currentSelection = this.shapeManager.currentScene
            if (scene !== currentSelection) {
                this.shapeManager.detachShape()
                this.shapeManager.attachNode(scene)
            }
            this.tryEnterEditMode()
        } else {
            this.shapeManager.detachShape()
            this.exitEditMode()
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (!this.isPointerDown || !this.editingShape || !this.dragTarget) {
            // Hover cursor
            if (this.editingShape) {
                this.cnvsElm.style.cursor = 'crosshair'
            } else {
                this.cnvsElm.style.cursor = 'default'
            }
            return
        }

        this.isDragging = true

        const dxWorld = e.offsetX - this.lastWorldPos.x
        const dyWorld = e.offsetY - this.lastWorldPos.y
        const localDelta = this.editingNode.worldDeltaToLocal(dxWorld, dyWorld)

        if (this.dragTarget.type === 'anchor') {
            const pt = this.editingShape.points[this.dragTarget.index]
            this.editingShape.updatePoint(this.dragTarget.index, pt.x + localDelta.x, pt.y + localDelta.y)
        } else if (this.dragTarget.type === 'control') {
            const pt = this.editingShape.points[this.dragTarget.index]
            const cp = pt[this.dragTarget.which]!
            this.editingShape.updateControlPoint(
                this.dragTarget.index,
                this.dragTarget.which,
                cp.x + localDelta.x, cp.y + localDelta.y
            )
        } else if (this.dragTarget.type === 'segment' && this.editingShape) {
            const pts = this.editingShape.points
            let i1 = this.dragTarget.index - 1
            let i2 = this.dragTarget.index
            
            if (i2 === pts.length) {
                i1 = pts.length - 1
                i2 = 0
            }

            this.editingShape.updatePoint(i1, pts[i1].x + localDelta.x, pts[i1].y + localDelta.y)
            this.editingShape.updatePoint(i2, pts[i2].x + localDelta.x, pts[i2].y + localDelta.y)
        }

        this.lastWorldPos = { x: e.offsetX, y: e.offsetY }
    }

    override handlePointerUp(e: MouseEvent): void {
        if (this.isDragging && this.editingShape) {
            this.shapeManager.finishDrag()
        }

        this.state = 'idle'
        this.dragTarget = null
        this.isPointerDown = false
        this.isDragging = false
        this.dragStart = null
        this.lastLocalPos = null
        this.lastWorldPos = null
    }

    private tryEnterEditMode(): void {
        const vp = this.getActiveVectorPath()
        if (vp) {
            this.editingShape = vp
            this.editingNode = this.shapeManager.currentScene
            this.cnvsElm.style.cursor = 'crosshair'
            this.shapeModifier?.setEditMode(true)
        } else {
            // Try to flatten parameterized primitive to vector path
            this.flattenShapeToVectorPath()
        }
    }

    private flattenShapeToVectorPath(): void {
        const currentScene = this.shapeManager?.currentScene
        if (!currentScene || !(currentScene instanceof ShapeNode)) return

        const shape = currentScene.shape
        if (shape instanceof VectorPath) return // Already a vector path
        
        // Ensure it has a conversion method
        if (!('convertToPathData' in shape) || typeof shape.convertToPathData !== 'function') return
        
        const pathData = shape.convertToPathData()
        if (!pathData) return // Cannot convert (e.g. Text, Image)

        // Generate new VectorPath replacement
        const pos = currentScene.getCoord()
        const newShape = ShapeFactory.createShape('path', { x: pos.x, y: pos.y })
        
        // Map the properties exactly over
        const oldProps = shape.getProperties()
        const newProps = newShape.getProperties()
        
        newProps.style = JSON.parse(JSON.stringify(oldProps.style))
        newProps.transform = JSON.parse(JSON.stringify(oldProps.transform))
        newProps.pathData = pathData
        
        // Size bounds are now dictated by path, but we keep transform scaling
        
        const newNode = new ShapeNode(newShape)
        
        // Swap shapes in the tree
        const parent = currentScene.getParent()
        if (parent) {
            parent.addChildNode(newNode)
            currentScene.destroy()
            
            // Attach tool to new node
            this.shapeManager.detachShape()
            this.shapeManager.attachNode(newNode)
            
            this.editingShape = newShape as VectorPath
            this.editingNode = newNode
            this.cnvsElm.style.cursor = 'crosshair'
            this.shapeModifier?.setEditMode(true)
        }
    }

    private exitEditMode(): void {
        if (this.editingShape) {
            this.editingShape.selectedPointIndex = -1
            this.editingShape.selectedSegmentIndex = -1
        }
        this.editingShape = null
        this.editingNode = null
        this.state = 'idle'
        this.dragTarget = null
        this.cnvsElm.style.cursor = 'default'
        this.shapeModifier?.setEditMode(false)
    }

    // Handle keyboard input for delete
    override handleKeyDown(e: KeyboardEvent): void {
        if (!this.editingShape) return

        if (e.key === 'Delete' || e.key === 'Backspace') {
            const idx = this.editingShape.selectedPointIndex
            if (idx >= 0 && this.editingShape.points.length > 2) {
                this.editingShape.removePoint(idx)
                this.editingShape.selectedPointIndex = Math.min(idx, this.editingShape.points.length - 1)
            }
        } else if (e.key === 'Escape') {
            this.exitEditMode()
        }
    }

    override toolChange(): void {
        this.exitEditMode()
        super.toolChange()
    }
}

export default EditTool
