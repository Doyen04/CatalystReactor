import Tool from './Tool'
import ShapeNode from '@lib/node/ShapeNode'
import SceneNode from '@lib/node/Scene'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import type { PathPoint, Properties } from '@lib/types/shapes'
import { UpdateProperties } from '@/lib/engine/commands/UpdateProperties'
import type { ToolContext } from './ToolContext'
import type { ToolType } from './toolTypes'

type PathMode = Extract<ToolType, 'line' | 'path' | 'bezier'>
type PathState = 'idle' | 'placing' | 'dragging-handle'

interface PathModeConfig {
    smoothOnAdd: boolean
    snapClose: boolean
    shiftLock45: boolean
    doubleClickFinish: boolean
    dragHandles: boolean
}

const PATH_MODE_CONFIG: Record<PathMode, PathModeConfig> = {
    line: { smoothOnAdd: false, snapClose: false, shiftLock45: true, doubleClickFinish: true, dragHandles: false },
    path: { smoothOnAdd: false, snapClose: true, shiftLock45: false, doubleClickFinish: false, dragHandles: true },
    bezier: { smoothOnAdd: true, snapClose: true, shiftLock45: false, doubleClickFinish: false, dragHandles: true },
}

class PathTool extends Tool {
    private mode: PathMode
    private activeShape: VectorPath | null = null
    private activeNode: SceneNode | null = null
    private state: PathState = 'idle'
    private lastDownPos: { x: number; y: number } | null = null
    private lastSnapShape: VectorPath | null = null
    private lastClickTime: number = 0
    private initialProps: Properties | null = null

    constructor(cnvs: HTMLCanvasElement, ctx: ToolContext, mode: PathMode) {
        super(cnvs, ctx)
        this.mode = mode
    }

    private get cfg(): PathModeConfig {
        return PATH_MODE_CONFIG[this.mode]
    }

    override handlePointerDown(e: MouseEvent) {
        this.isPointerDown = true
        this.isDragging = false
        this.lastDownPos = { x: e.offsetX, y: e.offsetY }

        // Double-click detection to finish (line mode only)
        const now = Date.now()
        if (now - this.lastClickTime < 300 && this.state === 'placing' && this.cfg.doubleClickFinish) {
            this.lastClickTime = 0
            this.finishPath()
            return
        }
        this.lastClickTime = now

        if (this.state === 'idle') {
            this.startPath(e)
        } else if (this.state === 'placing' && this.activeShape) {
            this.placeNextPoint(e)
        }
    }

    override handlePointerMove(e: MouseEvent): void {
        if (!this.activeShape || !this.activeNode || this.state === 'idle') return

        const { x, y } = this.activeNode.worldToLocal(e.offsetX, e.offsetY)

        if (this.isPointerDown && this.lastDownPos && this.cfg.dragHandles) {
            // Dragging after clicking — create symmetric Bézier handles
            const dx = e.offsetX - this.lastDownPos.x
            const dy = e.offsetY - this.lastDownPos.y
            if (Math.sqrt(dx * dx + dy * dy) > 3) {
                this.isDragging = true
                this.state = 'dragging-handle'

                const pts = this.activeShape.points
                const lastPt = pts[pts.length - 1]

                // Symmetric handles: cp2 follows mouse, cp1 mirrors
                lastPt.cp2 = { x, y }
                lastPt.cp1 = {
                    x: lastPt.x - (x - lastPt.x),
                    y: lastPt.y - (y - lastPt.y),
                }
                lastPt.smooth = true
            }
        } else {
            // Just hovering — update preview line
            if (this.lastSnapShape) {
                this.lastSnapShape.snapPointIndex = -1
                this.lastSnapShape = null
            }

            let endX = x
            let endY = y

            const snap = this.cfg.snapClose ? this.findSnapPoint(e, this.activeShape) : null
            if (snap) {
                const local = this.activeNode.worldToLocal(snap.x, snap.y)
                endX = local.x
                endY = local.y
                snap.shape.snapPointIndex = snap.index
                this.lastSnapShape = snap.shape
            }

            // Line mode previews the 45°-locked segment
            if (this.cfg.shiftLock45 && e.shiftKey) {
                const pts = this.activeShape.points
                const start = pts[pts.length - 1]
                const dx2 = endX - start.x
                const dy2 = endY - start.y
                const angle = Math.atan2(dy2, dx2)
                const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
                endX = start.x + Math.cos(snapped) * dist
                endY = start.y + Math.sin(snapped) * dist
            }

            this.activeShape.previewPoint = { x: endX, y: endY }
        }
    }

    override handlePointerUp(_e: MouseEvent): void {
        this.isPointerDown = false

        if (this.state === 'dragging-handle') {
            this.state = 'placing'
        }

        this.lastDownPos = null
        // Don't call super — we don't want to switch to select tool yet
    }

    override handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape' || e.key === 'Enter') {
            if (this.activeShape) {
                this.activeShape.previewPoint = null
                this.finishPath()
            }
        }
    }

    // ── Drawing steps ─────────────────────────────────────────────

    private startPath(e: MouseEvent): void {
        let scene = this.ctx.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        if (!scene) scene = this.ctx.sceneManager.getRootContainer()

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        // The whole draw session is one journaled transaction: the record insert
        // and all in-place point mutations are diffed and committed once at the end.
        // mergeKey is null deliberately so consecutive paths are never coalesced.
        this.ctx.commandManager.begin(`Draw ${this.mode}`, null)

        const shapeNode = this.ctx.sceneManager.addShapeToScene(this.mode, { x: 0, y: 0 }) as ShapeNode
        const shape = shapeNode.shape

        if (shape && shape instanceof VectorPath) {
            this.activeShape = shape

            shapeNode.setPosition(x, y)
            // Force matrix update so worldToLocal works immediately
            shapeNode.updateWorldMatrix(scene.getWorldMatrix() || undefined)

            // Snapshot before the first point so the finished path diffs in one step
            this.initialProps = structuredClone(shape.getProperties())

            shape.addPoint(this.makePoint(0, 0))

            this.ctx.shapeManager.attachNode(shapeNode)
            this.ctx.shapeManager.setSuppressHandles(true)
            this.activeNode = shapeNode
            this.state = 'placing'
        } else {
            // Nothing to draw with — leave no record behind
            this.ctx.commandManager.abort()
        }
    }

    private placeNextPoint(e: MouseEvent): void {
        if (!this.activeShape || !this.activeNode) return

        const snap = this.cfg.snapClose ? this.findSnapPoint(e, this.activeShape) : null
        let endX: number
        let endY: number

        if (snap) {
            const local = this.activeNode.worldToLocal(snap.x, snap.y)
            endX = local.x
            endY = local.y

            // If snapping to the first point of the current shape, close it
            if (snap.shape === this.activeShape && snap.index === 0 && this.activeShape.points.length > 2) {
                this.activeShape.closed = true
                this.activeShape.previewPoint = null
                this.finishPath()
                return
            }
        } else {
            const local = this.activeNode.worldToLocal(e.offsetX, e.offsetY)
            endX = local.x
            endY = local.y

            // Line mode locks new segments to 45° increments with Shift
            if (this.cfg.shiftLock45 && e.shiftKey) {
                const pts = this.activeShape.points
                const start = pts[pts.length - 1]
                const dx = endX - start.x
                const dy = endY - start.y
                const angle = Math.atan2(dy, dx)
                const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                const dist = Math.sqrt(dx * dx + dy * dy)
                endX = start.x + Math.cos(snapped) * dist
                endY = start.y + Math.sin(snapped) * dist
            }
        }

        // Check if clicking near the first point to close (belt-and-braces for snap)
        if (this.cfg.snapClose) {
            const firstPt = this.activeShape.points[0]
            const dx = endX - firstPt.x
            const dy = endY - firstPt.y
            if (this.activeShape.points.length > 2 && Math.sqrt(dx * dx + dy * dy) < 12) {
                this.activeShape.closed = true
                this.activeShape.previewPoint = null
                this.finishPath()
                return
            }
        }

        // Add a new point
        this.activeShape.addPoint(this.makePoint(endX, endY))
        if (this.activeNode) {
            this.activeNode.updateWorldMatrix(this.activeNode.getParent()?.getWorldMatrix() || undefined)
        }
    }

    private makePoint(x: number, y: number): PathPoint {
        return this.cfg.smoothOnAdd ? { x, y, smooth: true } : { x, y }
    }

    // ── Finishing and cancelling ──────────────────────────────────

    private finishPath(): void {
        if (this.activeShape) {
            this.ctx.shapeManager.setSuppressHandles(false)
            this.activeShape.previewPoint = null
            if (this.activeShape.points.length < 2) {
                this.cancelDraw()
            } else {
                this.commitDraw()
            }
        }
        this.resetDrawState()
        this.ctx.setTool(this.ctx.defaultTool)
    }

    private commitDraw(): void {
        if (!this.activeShape) return
        const id = this.activeShape.data.id
        const finalProps = this.activeShape.getProperties()
        // The transaction holds [insert, propsDiff]; one undo step removes the whole path.
        this.ctx.commandManager.apply(new UpdateProperties(id, structuredClone(this.initialProps), structuredClone(finalProps)))
        this.ctx.commandManager.commit()
        this.ctx.shapeManager.finishDrag()
    }

    private cancelDraw(): void {
        // abort reverts the journaled insert and every point mutation in the
        // transaction, so an incomplete draw leaves no record and no undo step.
        this.ctx.shapeManager.setSuppressHandles(false)
        this.ctx.commandManager.abort()
        this.ctx.shapeManager.detachShape()
    }

    private resetDrawState(): void {
        if (this.lastSnapShape) {
            this.lastSnapShape.snapPointIndex = -1
            this.lastSnapShape = null
        }
        this.activeShape = null
        this.activeNode = null
        this.lastClickTime = 0
        this.initialProps = null
        this.state = 'idle'
    }

    override toolChange(): void {
        // If we're in the middle of placing points, finish the path
        if (this.activeShape && this.state !== 'idle') {
            this.activeShape.previewPoint = null
            if (this.activeShape.points.length >= 2) {
                this.commitDraw()
            } else {
                this.cancelDraw()
            }
        }
        this.resetDrawState()
        super.toolChange()
    }
}

export default PathTool