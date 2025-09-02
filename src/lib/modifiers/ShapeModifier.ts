import type { Canvas } from 'canvaskit-wasm'
import Handle from './Handles'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SText from '@lib/shapes/primitives/SText'
import SceneNode from '@lib/node/Scene'
import { Coord } from '@lib/types/shapes'
import { ShapeData } from './modifier'

// const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private strokeColor: string | number[]
    private strokeWidth: number
    private fill: string = '#fff'
    private handles: Handle[]
    private isHovered: boolean
    private selectedModifierHandle: Handle | null
    private initialShapeData: ShapeData | null = null
    private font: SText

    constructor() {
        this.strokeColor = '#00f'
        this.strokeWidth = 1
        this.handles = []
        this.isHovered = false
        this.selectedModifierHandle = null
        this.font = new SText(0, 0)
    }

    setUpHandles(scene: SceneNode) {
        this.handles = []
        if (!scene) {
            console.log('no shape for shape modifier')
            return
        }

        this.handles = scene.getModifierHandles()
        this.updateResizerPositions(scene)
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

    storeShapeInitialShapeData(scene: SceneNode) {
        if (!scene) return

        const Matrix = this.resource.canvasKit.Matrix
        const dim = scene.getDim()
        const position = scene.getCoord()

        const scale = scene.getScale()
        const rotation = scene.getRotationAngle()
        const rotationAnchor = scene.getRotationAnchorPoint()

        if (this.initialShapeData === null) {
            const initialShapeData = {
                position: position,
                dimension: dim,
                scale: scale,
                rotation: rotation,
                rotationAnchor: rotationAnchor,
                worldTransform: [...scene.getWorldMatrix()],
                inverseWorldTransform: Matrix.invert([...scene.getWorldMatrix()]),
            }

            this.initialShapeData = initialShapeData
        }
        console.log(position, this.initialShapeData.worldTransform, 'onrisepos')
    }

    handleRemoveModiferHandle() {
        console.log('finished dragging handle')
        if (!this.selectedModifierHandle) return
        this.selectedModifierHandle.isDragging = false
        this.initialShapeData = null
        this.selectedModifierHandle = null
    }

    selectModifierHandles(x: number, y: number, scene: SceneNode) {
        if (this.handles.length == 0 || !scene) return null
        let selected: Handle = null

        const { x: tx, y: ty } = scene.worldToLocal(x, y)

        for (const node of this.handles) {
            if (node && node.isCollide(tx, ty)) {
                selected = node
                break
            }
        }
        if (!selected) {
            //use bounding box
            const dimen = scene.getDim()
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

    handleModifierDrag(dragStart: Coord, dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'radius':
                    this.selectedModifierHandle.updateShapeRadii(e, scene, this.initialShapeData)
                    break
                case 'size':
                    this.selectedModifierHandle.updateShapeDim(dragStart, e, scene, this.initialShapeData)
                    break
                case 'angle':
                    this.selectedModifierHandle.updateShapeAngle(e, scene, this.initialShapeData)
                    break
                case 'c-ratio':
                    this.selectedModifierHandle.updateOvalRatio(dx, dy, scene)
                    break
                case 's-ratio':
                    this.selectedModifierHandle.updateStarRatio(dx, dy, e, scene)
                    break
                case 'arc':
                    this.selectedModifierHandle.updateShapeArc(dx, dy, e, scene)
                    break
                case 'vertices':
                    this.selectedModifierHandle.updateShapeVertices(dx, dy, scene)
                    break
                default:
                    break
            }
        }
    }

    handleModifierDown(dragStart: Coord, e: MouseEvent, scene: SceneNode) {
        if (!scene) return

        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'angle':
                    this.selectedModifierHandle.shapeAngleOnMouseDown(e, scene, this.initialShapeData)
                    break
                default:
                    break
            }
        }
    }

    drag(dragStart: Coord, dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        this.selectedModifierHandle.isDragging = true
        if (this.selectedModifierHandle.type === 'size') this.isHovered = false

        this.handleModifierDrag(dragStart, dx, dy, e, scene)
    }

    updateResizerPositions(scene: SceneNode) {
        if (!scene) {
            console.log(' no shape for updateresizer')
            return
        }

        for (const resizer of this.handles) {
            const { x, y } = scene.getModifierHandlesPos(resizer)
            resizer.updatePosition(x, y)
        }
        this.updateText(scene)
    }

    //local coord
    updateText(scene: SceneNode) {
        const { width, height } = scene.getDim()

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

    handleMouseDown(dragStart: Coord, e: MouseEvent, scene: SceneNode) {
        if (!scene) return

        this.storeShapeInitialShapeData(scene)
        this.handleModifierDown(dragStart, e, scene)
    }

    hasSelectedHandle() {
        return this.selectedModifierHandle !== null
    }

    setHover(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }

    canDraw(scene: SceneNode): boolean {
        if (!scene) return false
        const { width, height } = scene.getDim()
        const MINSIZE = 5

        return width < MINSIZE || height < MINSIZE
    }

    collideRect(x: number, y: number, scene: SceneNode): boolean {
        if (!scene) return false

        const { x: tx, y: ty } = scene.worldToLocal(x, y)
        const { width, height } = scene.getDim()

        return tx >= 0 && tx <= width && ty >= 0 && ty <= height
    }

    draw(canvas: Canvas, scene: SceneNode): void {
        if (!scene || this.canDraw(scene) || !this.resource) {
            return
        }
        this.setPaint()

        canvas.save()
        canvas.concat(scene.getWorldMatrix())

        const dimen = scene.getDim()

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

        this.drawText(canvas, scene)
    }

    drawText(canvas: Canvas, scene: SceneNode) {
        if (!scene) return

        const bRect = scene.getAbsoluteBoundingRect()

        canvas.save()
        canvas.translate((bRect.left + bRect.right) / 2, bRect.bottom + 5)

        const { width: tWidth } = this.font.getDim()
        canvas.translate(-tWidth / 2, 0)

        this.font.draw(canvas)
        canvas.restore()
    }

    destroy() {
        this.strokeColor = ''
        this.strokeWidth = 0
        this.fill = ''
        this.handles = []
        this.isHovered = null
        this.selectedModifierHandle = null
    }
}

export default ShapeModifier
