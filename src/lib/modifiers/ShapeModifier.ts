import type { Canvas } from 'canvaskit-wasm'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import SText from '@lib/shapes/primitives/SText'
import SceneNode from '@lib/node/Scene'
import ShapeNode from '@lib/node/ShapeNode'
import { Coord, InitialTransformState } from '@lib/types/shapes'
import { ShapeData as StoreShapeData } from '@lib/core/EngineStateStore'
import container from '@lib/core/DependencyManager'
import PaintManager from '@lib/core/PaintManager'
import VectorPath from '@lib/shapes/primitives/VectorPath'
import { getOppositeHandle, getHandleLocalPoint } from '@lib/helper/handleUtil'

// Helper for local transformation
function transformPoint(matrix: number[], x: number, y: number, resource: CanvasKitResources) {
    const Matrix = resource.canvasKit.Matrix
    const localCurrent = Matrix.mapPoints(matrix, [x, y])
    return { x: localCurrent[0], y: localCurrent[1] }
}

// const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private scene: SceneNode | null
    private strokeColor: string | number[]
    private strokeWidth: number
    private fill: string = '#fff'
    private isHovered: boolean
    private selectedModifierHandle: string | null
    private initialShapeData: InitialTransformState | null = null
    private font: SText
    private paintManager: PaintManager
    private _editMode: boolean = false

    constructor() {
        this.scene = null
        this.strokeColor = '#00f'
        this.paintManager = container.resolve('paintManager')
        this.strokeWidth = 1
        this.isHovered = false
        this.selectedModifierHandle = null
        
        const dummyData: StoreShapeData = {
            id: 'dimension-label',
            type: 'text' as any,
            properties: {
                transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorPoint: null },
                size: { width: 0, height: 0 },
                style: {
                    fill: { color: { type: 'solid', color: [1, 1, 1, 1] }, opacity: 1 },
                    stroke: { color: { type: 'solid', color: [0, 0, 0, 1] }, opacity: 1, width: 0 }
                },
                textStyle: {
                    textColor: [1, 1, 1, 1],
                    fontSize: 10,
                    fontFamily: ['Inter', 'sans-serif'],
                }
            }
        }
        this.font = new SText(dummyData)
    }

    attachShape(scene: SceneNode) {
        this.scene = scene
        if (!this.scene) {
            console.log('no shape for shape modifier')
            return
        }
        this.updateResizerPositions() // Left for backwards compatibility text updating
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
        this.selectedModifierHandle = null
    }

    selectModifier(x: number, y: number) {
        if (!this.scene) return null

        const { x: tx, y: ty } = this.scene.worldToLocal(x, y)
        const hitID = this.scene.shape.hitTestModifierHandle(tx, ty)
        
        this.selectedModifierHandle = hitID
        return hitID
    }

    handleModifierDrag(dragStart: Coord, e: MouseEvent) {
        if (!this.selectedModifierHandle || !this.scene) return
        
        if (this.selectedModifierHandle.startsWith('size-')) {
            this.updateShapeDim(this.selectedModifierHandle, dragStart, e)
        } else if (this.selectedModifierHandle === 'angle') {
            this.updateShapeAngle(e)
        } else {
            // Transform pointer to local space before delegating
            const localCurrent = transformPoint(this.initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY, this.resource)
            const localDragStart = transformPoint(this.initialShapeData.inverseWorldTransform, dragStart.x, dragStart.y, this.resource)

            // Delegate parametric modifications straight to the pure Shape node
            this.scene.shape.dragModifierHandle(this.selectedModifierHandle, localCurrent, localDragStart, this.initialShapeData)
        }
    }

    private updateShapeDim(handleID: string, dragStart: Coord, e: MouseEvent) {
        if (!this.scene || !this.initialShapeData) return
        const initial = this.initialShapeData
        
        const localStart = transformPoint(initial.inverseWorldTransform, dragStart.x, dragStart.y, this.resource)
        const localCurrent = transformPoint(initial.inverseWorldTransform, e.offsetX, e.offsetY, this.resource)

        let newWidth = initial.dimension.width
        let newHeight = initial.dimension.height

        const dx = localCurrent.x - localStart.x
        const dy = localCurrent.y - localStart.y
        const pos = handleID.replace('size-', '')

        switch (pos) {
            case 'top-left': newWidth -= dx; newHeight -= dy; break
            case 'top-right': newWidth += dx; newHeight -= dy; break
            case 'bottom-left': newWidth -= dx; newHeight += dy; break
            case 'bottom-right': newWidth += dx; newHeight += dy; break
            case 'top': newHeight -= dy; break
            case 'bottom': newHeight += dy; break
            case 'left': newWidth -= dx; break
            case 'right': newWidth += dx; break
        }

        const MIN_SIZE = 2
        const absW = Math.max(MIN_SIZE, Math.abs(newWidth))
        const absH = Math.max(MIN_SIZE, Math.abs(newHeight))

        const scaleX = (newWidth < 0 ? -1 : 1) * Math.sign(initial.scale.x || 1)
        const scaleY = (newHeight < 0 ? -1 : 1) * Math.sign(initial.scale.y || 1)

        const fixedHandleKey = getOppositeHandle(pos as any)
        const fixedLocal = getHandleLocalPoint(fixedHandleKey, initial.dimension.width, initial.dimension.height)
        const fixedWorld = transformPoint(initial.localTransform, fixedLocal.x, fixedLocal.y, this.resource)
        
        const handleNewLocal = getHandleLocalPoint(fixedHandleKey, absW, absH)
        const zeroTransform = this.scene.buildZeroTransform(absW, absH, initial.rotation, { x: scaleX, y: scaleY }, initial.rotationAnchor)

        const offset = transformPoint(zeroTransform, handleNewLocal.x, handleNewLocal.y, this.resource)
        const posX = (fixedWorld ? fixedWorld.x : initial.position.x) - offset.x
        const posY = (fixedWorld ? fixedWorld.y : initial.position.y) - offset.y

        this.scene.updateScene({
            position: { x: Math.round(posX), y: Math.round(posY) },
            scale: { x: scaleX, y: scaleY },
            dimension: { width: absW, height: absH },
        })
    }

    private updateShapeAngle(e: MouseEvent) {
        if (!this.scene || !this.initialShapeData) return
        const initial = this.initialShapeData

        const center = transformPoint(
            initial.worldTransform,
            initial.dimension.width * initial.rotationAnchor.x,
            initial.dimension.height * initial.rotationAnchor.y,
            this.resource
        )

        const currentMouseAngle = Math.atan2(e.offsetY - center.y, e.offsetX - center.x)
        const startMouseAngle = initial.initialMouseAngle ?? currentMouseAngle
        const delta = currentMouseAngle - startMouseAngle
        
        this.scene.setAngle(initial.rotation + delta)
    }

    handleModifierDown(dragStart: Coord, e: MouseEvent) {
        if (!this.scene || !this.selectedModifierHandle) return

        if (this.selectedModifierHandle === 'angle') {
            const Matrix = this.resource.canvasKit.Matrix
            const center = Matrix.mapPoints(this.initialShapeData.worldTransform, [
                this.initialShapeData.dimension.width * this.initialShapeData.rotationAnchor.x,
                this.initialShapeData.dimension.height * this.initialShapeData.rotationAnchor.y,
            ])

            const initialMouseAngle = Math.atan2(e.offsetY - center[1], e.offsetX - center[0])
            this.initialShapeData.initialMouseAngle = initialMouseAngle
        }
    }

    update() {
        this.updateResizerPositions()
    }

    dragHandle(dragStart: Coord, e: MouseEvent) {
        if (this.selectedModifierHandle?.startsWith('size')) this.isHovered = false
        this.handleModifierDrag(dragStart, e)
    }

    dragShape(dragStart: Coord, e: MouseEvent) {
        const { position } = this.initialShapeData
        const newX = position.x + (e.offsetX - dragStart.x)
        const newY = position.y + (e.offsetY - dragStart.y)

        this.scene.setPosition(newX, newY)
    }

    updateResizerPositions() {
        if (!this.scene) return
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

        this.paintManager.stroke.setColor(strokeColor)
        this.paintManager.stroke.setStrokeWidth(this.strokeWidth)
        this.paintManager.paint.setColor(fillColor)
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
        this.isHovered = false
        this.selectedModifierHandle = null
        this.initialShapeData = null
    }
    setHover(bool: boolean) {

        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }

    setEditMode(editMode: boolean): void {
        this._editMode = editMode
    }

    isInEditMode(): boolean {
        return this._editMode
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

        // In edit mode for VectorPaths, draw the path edit overlay instead
        if (this._editMode && this.scene instanceof ShapeNode && this.scene.shape instanceof VectorPath) {
            this.setPaint()
            canvas.save()
            canvas.concat(this.scene.getWorldMatrix())
            this.scene.shape.drawEditOverlay(canvas)
            canvas.restore()
            this.drawText(canvas)
            return
        }

        this.setPaint()

        canvas.save()
        canvas.concat(this.scene.getWorldMatrix())

        // Delegate native rendering!
        this.scene.shape.drawModifierHandles(canvas, this.resource)

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
        this.isHovered = false
        this.selectedModifierHandle = null
    }
}

export default ShapeModifier
