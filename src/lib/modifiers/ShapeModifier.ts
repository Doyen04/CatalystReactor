import type { Canvas } from 'canvaskit-wasm'
import Handle from './Handles'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SText from '@lib/shapes/primitives/SText'
import SceneNode from '@lib/node/Scene'
import { Coord } from '@lib/types/shapes'
import { ShapeData } from './modifier'
import {
    updateShapeRadii,
    updateShapeDim,
    updateShapeAngle,
    updateOvalRatio,
    updateStarRatio,
    updateShapeArc,
    updateShapeVertices,
} from './modifierUtility'

// const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private scene: SceneNode | null
    private strokeColor: string | number[]
    private strokeWidth: number
    private fill: string = '#fff'
    private handles: Handle[]
    private isHovered: boolean
    private selectedModifierHandle: Handle | null
    private initialShapeData: ShapeData | null = null
    private font: SText

    constructor() {
        this.scene = null
        this.strokeColor = '#00f'
        this.strokeWidth = 1
        this.handles = []
        this.isHovered = false
        this.selectedModifierHandle = null
        this.font = new SText(0, 0)
    }

    attachShape(scene: SceneNode) {
        this.handles = []
        this.scene = scene
        if (!this.scene) {
            console.log('no shape for shape modifier')
            return
        }

        this.handles = this.scene.getModifierHandles()
        this.updateResizerPositions()
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

    storeShapeInitialShapeData() {
        if (!this.scene) return

        const Matrix = this.resource.canvasKit.Matrix
        const dimension = this.scene.getDim()
        const position = this.scene.getCoord()

        const scale = this.scene.getScale()
        const rotation = this.scene.getRotationAngle()
        const rotationAnchor = this.scene.getRotationAnchorPoint()
        const arcAngle = this.scene.getArcAngles()

        if (this.initialShapeData === null) {
            const initialShapeData = {
                position,
                dimension,
                scale,
                rotation,
                rotationAnchor,
                localTransform: [...this.scene.getLocalMatrix()],
                worldTransform: [...this.scene.getWorldMatrix()],
                inverseWorldTransform: Matrix.invert([...this.scene.getWorldMatrix()]),
                arcAngle,
            }

            this.initialShapeData = initialShapeData
        }
    }

    handleRemoveModiferHandle() {
        console.log('finished dragging handle')
        this.initialShapeData = null
        if (this.selectedModifierHandle) {
            this.selectedModifierHandle.reset()
            this.selectedModifierHandle.isDragging = false
            this.selectedModifierHandle = null
        }
    }

    selectModifier(x: number, y: number) {
        if (this.handles.length == 0 || !this.scene) return null
        let selected: Handle = null

        const { x: tx, y: ty } = this.scene.worldToLocal(x, y)

        for (const node of this.handles) {
            if (node && node.isCollide(tx, ty)) {
                selected = node
                break
            }
        }
        if (!selected) {
            //use bounding box
            const dimen = this.scene.getDim()
            const bRect = {
                left: 0,
                top: 0,
                right: dimen.width,
                bottom: dimen.height,
            }
            const tolerance = 5
            const nearTop = Math.abs(ty - bRect.top) <= tolerance && tx >= bRect.left - tolerance && tx <= bRect.right + tolerance
            const nearBottom = Math.abs(ty - bRect.bottom) <= tolerance && tx >= bRect.left - tolerance && tx <= bRect.right + tolerance
            const nearLeft = Math.abs(tx - bRect.left) <= tolerance && ty >= bRect.top - tolerance && ty <= bRect.bottom + tolerance
            const nearRight = Math.abs(tx - bRect.right) <= tolerance && ty >= bRect.top - tolerance && ty <= bRect.bottom + tolerance

            //work on this
            if (nearTop) selected = new Handle(0, 0, 'top', 'size')
            if (nearBottom) selected = new Handle(0, 0, 'bottom', 'size')
            if (nearLeft) selected = new Handle(0, 0, 'left', 'size')
            if (nearRight) selected = new Handle(0, 0, 'right', 'size')
        }
        this.selectedModifierHandle = selected
        return selected
    }

    handleModifierDrag(dragStart: Coord, e: MouseEvent) {
        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'radius':
                    updateShapeRadii(this.selectedModifierHandle, e, this.scene, this.initialShapeData)
                    break
                case 'size':
                    updateShapeDim(this.selectedModifierHandle, dragStart, e, this.scene, this.initialShapeData)
                    break
                case 'c-ratio':
                    updateOvalRatio(this.selectedModifierHandle, e, this.scene, this.initialShapeData)
                    break
                case 'arc':
                    updateShapeArc(this.selectedModifierHandle, e, this.scene, this.initialShapeData)
                    break
                case 'angle':
                    updateShapeAngle(e, this.scene, this.initialShapeData)
                    break
                case 's-ratio':
                    updateStarRatio(e, this.scene, this.initialShapeData)
                    break
                case 'vertices':
                    updateShapeVertices(e, this.scene, this.initialShapeData)
                    break
                default:
                    break
            }
        }
    }

    handleModifierDown(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'angle': {
                    const Matrix = this.resource.canvasKit.Matrix
                    const center = Matrix.mapPoints(this.initialShapeData.worldTransform, [
                        this.initialShapeData.dimension.width * this.initialShapeData.rotationAnchor.x,
                        this.initialShapeData.dimension.height * this.initialShapeData.rotationAnchor.y,
                    ])

                    const initialMouseAngle = Math.atan2(e.offsetY - center[1], e.offsetX - center[0])
                    this.initialShapeData.initialMouseAngle = initialMouseAngle
                    break
                }
                default:
                    break
            }
        }
    }

    update() {
        this.updateResizerPositions()
    }

    dragHandle(dragStart: Coord, e: MouseEvent) {
        this.selectedModifierHandle.isDragging = true
        if (this.selectedModifierHandle.type === 'size') this.isHovered = false

        this.handleModifierDrag(dragStart, e)
    }

    dragShape(dragStart: Coord, e: MouseEvent) {
        const { position } = this.initialShapeData
        const newX = position.x + (e.offsetX - dragStart.x)
        const newY = position.y + (e.offsetY - dragStart.y)

        this.scene.setPosition(newX, newY)
    }

    updateResizerPositions() {
        if (!this.scene) {
            console.log(' no shape for updateresizer')
            return
        }

        for (const resizer of this.handles) {
            const { x, y } = this.scene.getModifierHandlesPos(resizer)
            resizer.updatePosition(x, y)
        }
        this.updateText()
    }

    //local coord
    updateText() {
        const { width, height } = this.scene.getDim()

        this.font.setText(`${width} X ${height}`)
    }

    setPaint(): void {
        if (!this.resource) return

        const fillColor = Array.isArray(this.fill) ? this.fill : this.resource.canvasKit.parseColorString(this.fill)

        const strokeColor = Array.isArray(this.strokeColor) ? this.strokeColor : this.resource.canvasKit.parseColorString(this.strokeColor)

        this.resource.strokePaint.setColor(strokeColor)
        this.resource.strokePaint.setStrokeWidth(this.strokeWidth)

        this.resource.paint.setColor(fillColor)
    }

    handleMouseDown(dragStart: Coord, e: MouseEvent) {
        if (!this.scene) return

        this.storeShapeInitialShapeData()
        this.handleModifierDown(dragStart, e)
    }

    hasSelectedHandle() {
        return this.selectedModifierHandle !== null
    }

    detachShape() {
        this.scene = null
        this.handles = []
        this.isHovered = false
        this.selectedModifierHandle = null
        this.initialShapeData = null
    }
    setHover(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }

    canDraw(): boolean {
        if (!this.scene) return false
        const { width, height } = this.scene.getDim()
        const MINSIZE = 5

        return width < MINSIZE || height < MINSIZE
    }

    collideRect(x: number, y: number): boolean {
        if (!this.scene) return false

        const { x: tx, y: ty } = this.scene.worldToLocal(x, y)
        const { width, height } = this.scene.getDim()

        return tx >= 0 && tx <= width && ty >= 0 && ty <= height
    }

    draw(canvas: Canvas): void {
        if (!this.scene || this.canDraw() || !this.resource) {
            return
        }
        this.setPaint()

        canvas.save()
        canvas.concat(this.scene.getWorldMatrix())

        const dimen = this.scene.getDim()

        const rect = this.resource.canvasKit.XYWHRect(0, 0, dimen.width, dimen.height)

        canvas.drawRect(rect, this.resource.strokePaint)

        this.handles.forEach(handle => {
            if (handle.type === 'size') {
                handle.draw(canvas)
            } else if (this.isHovered && handle.type !== 'angle') {
                handle.draw(canvas)
            }
        })

        canvas.restore()

        this.drawText(canvas)
    }

    drawText(canvas: Canvas) {
        if (!this.scene) return

        const bRect = this.scene.getAbsoluteBoundingRect()

        canvas.save()
        canvas.translate((bRect.left + bRect.right) / 2, bRect.bottom + 5)

        const { width: tWidth } = this.font.getDim()
        canvas.translate(-tWidth / 2, 0)

        this.font.draw(canvas)
        canvas.restore()
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        }
        this.strokeColor = ''
        this.strokeWidth = 0
        this.fill = ''
        this.handles = []
        this.isHovered = null
        this.selectedModifierHandle = null
    }
}

export default ShapeModifier
