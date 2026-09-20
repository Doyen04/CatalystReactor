import type { Canvas, Paint, PathEffect } from 'canvaskit-wasm'
import { Coord, Properties } from '@lib/types/shapes'
import ShapeModifier from '@lib/modifiers/ShapeModifier'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import ShapeNode from '@lib/node/ShapeNode'
import EngineStateStore from './EngineStateStore'
import SnapManager, { SnapResult } from './SnapManager'
import CanvasKitResources from './CanvasKitResource'
import { requestRender } from '@/engine/render/renderRequest'
import type { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from './EngineEvents'
import { CommandManager } from '@/engine/commands/CommandManager'
import { UpdateProperties } from '@/engine/commands/UpdateProperties'
import type { DocumentModel } from '@/engine/document/DocumentModel'

class ShapeManager {
    private scene: SceneNode | null = null
    private shapeModifier: ShapeModifier | null
    private bus: EngineBus<EngineEvents>
    private commandManager: CommandManager
    private doc: DocumentModel
    private gridSize = 10
    private initialProps: Properties | null = null
    private activeSnapResult: SnapResult | null = null
    private snapGuidePaint: Paint | null = null
    private snapGuideDash: PathEffect | null = null
    private dragTransactionActive = false

    constructor(shapeModifier: ShapeModifier, bus: EngineBus<EngineEvents>, commandManager: CommandManager) {
        this.scene = null
        this.shapeModifier = shapeModifier
        this.bus = bus
        this.commandManager = commandManager
        this.doc = EngineStateStore.getInstance().getDocument()
    }

    setGridSize(size: number): void {
        this.gridSize = size
    }

    drawShape(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        this.scene.drawOnDrag(dragStart, e)

        this.shapeModifier?.update()
        this.emitDocumentChanged()
    }

    handleMouseDown(dragStart: Coord, e: MouseEvent) {
        if (this.scene) {
            this.initialProps = structuredClone(this.scene.getProperties())
        }
        this.shapeModifier?.handleMouseDown(dragStart, e)
    }

    drag(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        if (!this.dragTransactionActive) {
            if (this.scene instanceof ShapeNode && this.scene.shape) {
                this.commandManager.begin('Move', `translate:${this.scene.shape.data.id}`)
                this.dragTransactionActive = true
            }
        }

        let mouseX = e.offsetX
        let mouseY = e.offsetY

        // Handle snapping
        this.activeSnapResult = SnapManager.getInstance().getSnapResult(this.scene, { x: mouseX, y: mouseY }, this.gridSize)

        if (this.activeSnapResult && this.activeSnapResult.snapped) {
            mouseX = this.activeSnapResult.x
            mouseY = this.activeSnapResult.y
        }

        // Patch the event for the modifier — only override offsetX/offsetY
        const snappedEvent = new MouseEvent(e.type, e)
        Object.defineProperty(snappedEvent, 'offsetX', { value: mouseX })
        Object.defineProperty(snappedEvent, 'offsetY', { value: mouseY })

        if (this.shapeModifier?.hasSelectedHandle()) {
            this.shapeModifier?.dragHandle(dragStart, snappedEvent)
        } else {
            this.shapeModifier?.dragShape(dragStart, snappedEvent)
        }

        this.shapeModifier?.update()
        this.emitDocumentChanged()
    }

    moveScene(dx: number, dy: number) {
        if (!this.scene) return
        this.scene.move(dx, dy)

        this.shapeModifier?.update()
        this.emitDocumentChanged()
    }

    finishDrag() {
        if (!this.scene) return

        const parent = this.scene.getParent()
        if (this.scene instanceof ContainerNode) {
            this.scene.applyLayout()
        }
        if (parent instanceof ContainerNode) {
            parent.applyLayout()
        }

        this.shapeModifier?.handleRemoveModiferHandle()
        this.shapeModifier?.update()

        const finalProps = this.scene.getProperties()

        // Record history
        if (this.initialProps && this.scene instanceof ShapeNode && this.scene.shape) {
            const shapeId = this.scene.shape.data.id
            const hasChanged = JSON.stringify(this.initialProps) !== JSON.stringify(finalProps)

            if (hasChanged) {
                this.commandManager.apply(
                    new UpdateProperties(shapeId, structuredClone(this.initialProps), structuredClone(finalProps as Properties))
                )
                this.commandManager.commit()
            } else {
                this.commandManager.abort()
            }
        }
        this.emitDocumentChanged()
        this.initialProps = null
        this.activeSnapResult = null
        this.dragTransactionActive = false
    }

    cancelDrag() {
        if (this.dragTransactionActive && this.initialProps && this.scene instanceof ShapeNode && this.scene.shape) {
            const finalProps = this.scene.getProperties()
            if (finalProps) {
                this.commandManager.apply(
                    new UpdateProperties(this.scene.shape.data.id, structuredClone(this.initialProps), structuredClone(finalProps as Properties))
                )
            }
            this.commandManager.abort()
            this.shapeModifier?.handleRemoveModiferHandle()
            this.shapeModifier?.update()
            this.emitDocumentChanged()
        }
        this.initialProps = null
        this.activeSnapResult = null
        this.dragTransactionActive = false
        requestRender()
    }

    handleTinyShapes(): void {
        if (!this.scene) return

        const dim = this.scene.getDim()
        if (!dim) return

        const { height, width } = dim
        const minSize = 5

        if (width < minSize || height < minSize) {
            this.scene.drawDefault()
            console.log('Shape removed: too small add default size')
        }

        this.shapeModifier?.update()
        this.emitDocumentChanged()
    }

    get currentScene(): SceneNode | null {
        return this.scene
    }

    hasScene() {
        return this.scene != null
    }

    attachNode(scene: SceneNode) {
        if (!scene) return

        this.scene = scene
        this.shapeModifier?.attachShape(scene)

        if (this.scene && this.scene.shape) {
            this.bus.emit('selection:changed', { id: this.scene.shape.data.id })
        }

        this.emitDocumentChanged()
        requestRender()
    }

    detachShape() {
        console.log('cleaning up')

        this.scene?.cleanUp()
        this.scene = null
        this.shapeModifier?.detachShape()
        this.bus.emit('selection:changed', { id: null })
        requestRender()
    }

    destroy(): void {
        if (this.snapGuidePaint) {
            this.snapGuidePaint.delete()
            this.snapGuidePaint = null
        }
        if (this.snapGuideDash) {
            this.snapGuideDash.delete()
            this.snapGuideDash = null
        }
    }

    private emitDocumentChanged(): void {
        const id = this.scene?.shape?.data.id
        if (id) this.bus.emit('document:changed', { ids: [id] })
    }

    handleHover(x: number, y: number): string | null {
        if (!this.shapeModifier || !this.scene) return null

        const isCollide = this.shapeModifier.collideRect(x, y)
        if (isCollide) {
            this.shapeModifier.setHover(true)
        } else {
            this.shapeModifier.setHover(false)
        }

        return this.shapeModifier.selectModifier(x, y)
    }

    resetHover(scene: SceneNode | null) {
        if (this.scene !== scene) {
            this.shapeModifier?.setHover(false)
        }
    }

    collide(x: number, y: number): boolean {
        if (!this.scene) {
            return false
        }
        const handle = this.shapeModifier?.selectModifier(x, y)

        if (handle) {
            return true
        } else {
            return false
        }
    }
    setSuppressHandles(suppress: boolean) {
        this.shapeModifier?.setSuppressHandles(suppress)
    }

    draw(canvas: Canvas) {
        if (!this.shapeModifier) return
        this.shapeModifier.draw(canvas)
        this.drawSnapGuides(canvas)
    }

    private drawSnapGuides(canvas: Canvas) {
        if (!this.activeSnapResult || !this.activeSnapResult.snapped) return

        const ck = CanvasKitResources.getInstance()?.canvasKit
        if (!ck) return

        // Lazily create and cache the snap guide paint + dash effect
        if (!this.snapGuidePaint) {
            this.snapGuidePaint = new ck.Paint()
            this.snapGuidePaint.setStyle(ck.PaintStyle.Stroke)
            this.snapGuidePaint.setStrokeWidth(1)
            this.snapGuidePaint.setAntiAlias(true)

            this.snapGuideDash = ck.PathEffect.MakeDash([5, 5], 0)
            this.snapGuidePaint.setPathEffect(this.snapGuideDash)
        }

        // 1. Draw "Every Snap Available" (Indicators)
        const indicatorPaint = new ck.Paint()
        indicatorPaint.setStyle(ck.PaintStyle.Fill)
        indicatorPaint.setAntiAlias(true)

        for (const pt of this.activeSnapResult.indicators) {
            // Use different colors for different snap types for a premium feel
            const color = pt.type === 'center' ? ck.Color(255, 200, 0, 0.9) : ck.Color(0, 255, 255, 0.9)
            indicatorPaint.setColor(color)
            canvas.drawCircle(pt.x, pt.y, 3, indicatorPaint) // Small dots for availability
        }
        indicatorPaint.delete()

        // 2. Draw Snap Guide Lines (Infinite lines)
        for (const guide of this.activeSnapResult.guides) {
            // USER REQUEST: Remove middle cross line (center snaps)
            // We only draw infinite lines for edges, corners, and grid.
            if (guide.type === 'center') continue

            this.snapGuidePaint.setColor(guide.isGrid ? ck.Color(0, 255, 255, 0.4) : ck.Color(255, 0, 255, 0.7))

            const path = new ck.Path()
            if (guide.orientation === 'horizontal') {
                path.moveTo(-20000, guide.pos)
                path.lineTo(20000, guide.pos)
            } else {
                path.moveTo(guide.pos, -20000)
                path.lineTo(guide.pos, 20000)
            }
            canvas.drawPath(path, this.snapGuidePaint)
            path.delete()
        }
    }
}

export default ShapeManager
