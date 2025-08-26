import type { Canvas } from 'canvaskit-wasm'
import Handle from './Handles'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SText from '@lib/shapes/primitives/SText'
import SceneNode from '@lib/node/Scene'

// const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private scene: SceneNode | null
    private strokeColor: string | number[]
    private strokeWidth: number
    private fill: string = '#fff'
    private handles: Handle[]
    private isHovered: boolean
    private selectedModifierHandle: Handle | null
    private font: SText

    constructor() {
        this.scene = null
        this.strokeColor = '#00f'
        this.strokeWidth = 1
        this.handles = []
        this.isHovered = false
        this.selectedModifierHandle = null
        this.font = new SText(200, 0)
    }

    attachShape(scene: SceneNode) {
        this.handles = []
        this.scene = scene
        if (!this.scene) {
            console.log('no shape for shape modifier')
            return
        }

        this.handles = this.scene.getShape().getModifierHandles()
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

    handleRemoveModiferHandle() {
        console.log('finished dragging handle')
        if (!this.selectedModifierHandle) return
        this.selectedModifierHandle.isDragging = false
        this.selectedModifierHandle.resetAnchorPoint()
        this.selectedModifierHandle = null
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
            const dimen = this.scene.getShape().getDim()
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

    handleModifierDrag(x: number, y: number, e: MouseEvent) {
        const { x: mx, y: my } = this.scene.worldToParentLocal(e.offsetX, e.offsetY)

        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'radius':
                    this.selectedModifierHandle.updateShapeRadii(mx, my, this.scene)
                    break
                case 'size':
                    this.selectedModifierHandle.updateShapeDim(mx, my, this.scene)
                    break
                case 'c-ratio':
                    this.selectedModifierHandle.updateOvalRatio(mx, my, this.scene)
                    break
                case 's-ratio':
                    this.selectedModifierHandle.updateStarRatio(x, y, e, this.scene)
                    break
                case 'arc':
                    this.selectedModifierHandle.updateShapeArc(x, y, e, this.scene)
                    break
                case 'vertices':
                    this.selectedModifierHandle.updateShapeVertices(mx, my, this.scene)
                    break
                case 'angle':
                    this.selectedModifierHandle.updateShapeAngle(mx, my, this.scene)
                    break
                default:
                    break
            }
        }
    }

    update() {
        this.updateResizerPositions()
    }

    drag(x: number, y: number, e: MouseEvent) {
        this.selectedModifierHandle.isDragging = true
        if (this.selectedModifierHandle.type === 'size') this.isHovered = false
        this.handleModifierDrag(x, y, e)
    }

    updateResizerPositions() {
        if (!this.scene) {
            console.log(' no shape for updateresizer')

            return
        }

        for (const resizer of this.handles) {
            const { x, y } = this.scene.getShape().getModifierHandlesPos(resizer)
            resizer.updatePosition(x, y)
        }
        this.updateText()
    }

    //local coord
    updateText() {
        const { width, height } = this.scene.getShape().getDim()

        this.font.setText(`${width} X ${height}`)

        const { width: tWidth } = this.font.getDim()
        const pos = (width - tWidth) / 2
        this.font.setCoord(pos, height + 5)
    }
    setPaint(): void {
        if (!this.resource) return

        const fillColor = Array.isArray(this.fill) ? this.fill : this.resource.canvasKit.parseColorString(this.fill)

        const strokeColor = Array.isArray(this.strokeColor) ? this.strokeColor : this.resource.canvasKit.parseColorString(this.strokeColor)

        this.resource.strokePaint.setColor(strokeColor)
        this.resource.strokePaint.setStrokeWidth(this.strokeWidth)

        this.resource.paint.setColor(fillColor)
    }
    hasShape() {
        return this.scene.getShape() !== null
    }

    hasSelectedHandle() {
        return this.selectedModifierHandle !== null
    }
    getShape() {
        return this.scene.getShape()
    }
    detachShape() {
        this.scene = null
    }
    setHover(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }

    canDraw(): boolean {
        if (!this.scene && !this.scene.getShape()) return false
        const { width, height } = this.scene.getShape().getDim()
        const minSize = 5

        return width < minSize || height < minSize
    }

    collideRect(x: number, y: number): boolean {
        if (!this.scene) return false
        
        const { x: tx, y: ty } = this.scene.worldToLocal(x, y)
        const { width, height } = this.scene.getShape().getDim()

        return tx >= 0 && tx <= width && ty >= 0 && ty <= height
    }

    draw(canvas: Canvas): void {
        if (!this.scene || this.canDraw() || !this.resource) {
            return
        }
        this.setPaint()
        canvas.concat(this.scene.getLocalMatrix())

        const dimen = this.scene.getShape().getDim()

        const rect = this.resource.canvasKit.XYWHRect(0, 0, dimen.width, dimen.height)

        canvas.drawRect(rect, this.resource.strokePaint)
        this.font.draw(canvas)

        this.handles.forEach(handle => {
            if (handle.type === 'size') {
                handle.draw(canvas)
            } else if (this.isHovered && handle.type !== 'angle') {
                handle.draw(canvas)
            }
        })
    }

    destroy() {
        if (this.scene.getShape()) {
            this.scene.getShape().destroy()
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
