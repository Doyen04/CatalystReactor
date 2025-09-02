// Handle.ts
import type { Canvas } from 'canvaskit-wasm'
import { Coord, HandlePos, HandleType } from '@lib/types/shapes'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import clamp from '@lib/helper/clamp'
import SceneNode from '@lib/node/Scene'
import { getHandleLocalPoint, getOppositeHandle } from '@lib/helper/handleUtil'
import { ShapeData } from './modifier'

export default class Handle {
    x: number
    y: number
    size: number
    type: HandleType
    pos: HandlePos
    stroke: string | number[]
    fill: string | number[]
    isDragging: boolean = false
    handleArcAngle: number | null = null
    handleRatioAngle: number | null = null

    constructor(x: number, y: number, pos: HandlePos, type: HandleType, size = 6) {
        this.x = x
        this.y = y
        this.pos = pos
        this.type = type
        this.stroke = '#00f'
        this.fill = '#fff'

        // By default, use Oval for radius, Rect for size
        if (type !== 'size' && type !== 'angle') {
            this.size = 4
            if (type === 'arc' || type === 'c-ratio') {
                this.handleArcAngle = 0
                this.handleRatioAngle = 0
            }
        } else {
            this.size = size // Default size for the rect shaped resizers
        }
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

    updatePosition(x: number, y: number) {
        this.x = x
        this.y = y
    }

    isCollide(px: number, py: number): boolean {
        // Rectangle handle
        const hpad = 2
        if (this.type === 'size') {
            return px >= this.x - hpad && px <= this.x + this.size + hpad && py >= this.y - hpad && py <= this.y + this.size + hpad
        }
        // Oval handle (circle collision)
        const dx = px - this.x
        const dy = py - this.y
        const r = this.size * 2
        return dx * dx + dy * dy <= r * r
    }

    private calculateRatioFromMousePosition(e: Coord, centerX: number, centerY: number, width: number, height: number): number {
        const deltaX = e.x - centerX
        const deltaY = e.y - centerY
        const radiusX = width / 2
        const radiusY = height / 2

        const deg = Math.atan2(deltaY, deltaX)
        const cos = Math.cos(deg)
        const sin = Math.sin(deg)

        const ellipseRadiusAtAngle = Math.sqrt(
            (radiusX * radiusX * radiusY * radiusY) / (radiusY * radiusY * cos * cos + radiusX * radiusX * sin * sin)
        )

        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const ratio = Math.min(0.99, distanceFromCenter / ellipseRadiusAtAngle)

        return ratio
    }

    updateShapeRadii(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
        const { left, right, top, bottom } = scene.getRelativeBoundingRect()
        const Matrix = this.resource.canvasKit.Matrix
        const localCurrent = Matrix.mapPoints(initialShapeData.inverseWorldTransform, [e.offsetX, e.offsetY])

        console.log(left, right, top, bottom, e.offsetX, e.offsetY)

        let cornerX: number,
            cornerY: number,
            distX: number,
            distY: number,
            newRadius = 0

        const [x, y] = localCurrent

        switch (this.pos) {
            case 'top-left':
                cornerX = left
                cornerY = top
                distX = x - cornerX
                distY = y - cornerY
                if (distX >= 0 && distY >= 0) {
                    newRadius = Math.min(distX, distY)
                }
                break
            case 'top-right':
                cornerX = right
                cornerY = top
                distX = x - cornerX
                distY = y - cornerY
                if (distX <= 0 && distY >= 0) {
                    newRadius = Math.min(Math.abs(distX), distY)
                }
                break
            case 'bottom-left':
                cornerX = left
                cornerY = bottom
                distX = x - cornerX
                distY = y - cornerY
                if (distX >= 0 && distY <= 0) {
                    newRadius = Math.min(distX, Math.abs(distY))
                }
                break
            case 'bottom-right':
                cornerX = right
                cornerY = bottom
                distX = x - cornerX
                distY = y - cornerY
                if (distX <= 0 && distY <= 0) {
                    newRadius = Math.min(Math.abs(distX), Math.abs(distY))
                }
                break
            case 'top':
                cornerY = top
                distY = y - cornerY
                if (distY >= 0) {
                    newRadius = Math.abs(distY)
                }
                break
            default:
                console.log('not implemented position for radius handle')

                break
        }
        scene.setBorderRadius(newRadius, this.pos)
    }

    updateShapeDim(dragStart: Coord, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
        const Matrix = this.resource.canvasKit.Matrix
        const localStart = Matrix.mapPoints(initialShapeData.inverseWorldTransform, [dragStart.x, dragStart.y])
        const localCurrent = Matrix.mapPoints(initialShapeData.inverseWorldTransform, [e.offsetX, e.offsetY])

        let newWidth = initialShapeData.dimension.width
        let newHeight = initialShapeData.dimension.height

        const dx = localCurrent[0] - localStart[0]
        const dy = localCurrent[1] - localStart[1]

        switch (this.pos) {
            case 'top-left':
                newWidth = initialShapeData.dimension.width - dx
                newHeight = initialShapeData.dimension.height - dy
                break
            case 'top-right':
                newWidth = initialShapeData.dimension.width + dx
                newHeight = initialShapeData.dimension.height - dy
                break
            case 'bottom-left':
                newWidth = initialShapeData.dimension.width - dx
                newHeight = initialShapeData.dimension.height + dy
                break
            case 'bottom-right':
                newWidth = initialShapeData.dimension.width + dx
                newHeight = initialShapeData.dimension.height + dy
                break
            case 'top':
                newHeight = initialShapeData.dimension.height - dy
                break
            case 'bottom':
                newHeight = initialShapeData.dimension.height + dy
                break
            case 'left':
                newWidth = initialShapeData.dimension.width - dx
                break
            case 'right':
                newWidth = initialShapeData.dimension.width + dx
                break
        }

        const MIN_SIZE = 2
        const willFlipX = newWidth < 0
        const willFlipY = newHeight < 0
        const absW = Math.max(MIN_SIZE, Math.abs(newWidth))
        const absH = Math.max(MIN_SIZE, Math.abs(newHeight))

        const desiredScaleX = willFlipX ? -Math.sign(initialShapeData.scale.x || 1) : Math.sign(initialShapeData.scale.x || 1)
        const desiredScaleY = willFlipY ? -Math.sign(initialShapeData.scale.y || 1) : Math.sign(initialShapeData.scale.y || 1)

        const fixedHandleKey = getOppositeHandle(this.pos)
        const fixedLocal = getHandleLocalPoint(fixedHandleKey, initialShapeData.dimension.width, initialShapeData.dimension.height)
        const fixedWorld = Matrix.mapPoints(initialShapeData.worldTransform, [fixedLocal.x, fixedLocal.y])
        const handleNewLocal = getHandleLocalPoint(fixedHandleKey, absW, absH)

        const zeroTransform = scene.buildZeroTransform(
            absW,
            absH,
            initialShapeData.rotation,
            { x: desiredScaleX, y: desiredScaleY },
            initialShapeData.rotationAnchor
        )

        const offset = Matrix.mapPoints(zeroTransform, [handleNewLocal.x, handleNewLocal.y])
        const posX = (fixedWorld ? fixedWorld[0] : initialShapeData.position.x) - offset[0]
        const posY = (fixedWorld ? fixedWorld[1] : initialShapeData.position.y) - offset[1]

        console.log(posX, posY, initialShapeData.worldTransform, 'while-resizing')

        scene.updateScene({
            position: { x: Math.floor(posX), y: Math.floor(posY) },
            scale: { x: desiredScaleX, y: desiredScaleY },
            dimension: { width: absW, height: absH },
        })
    }

    clampAngleToArc(t: number, start: number, end: number, prev: number): number {
        const TWO_PI = 2 * Math.PI

        const t0 = t < 0 ? t + TWO_PI : t

        if (t0 < start) return prev
        if (t0 > end) return prev
        return t0
    }

    updateOvalRatio(x: number, y: number, scene: SceneNode) {
        const { x: cx, y: cy } = scene.getCenterCoord()
        const { width, height } = scene.getDim()

        const radiusX = width / 2
        const radiusY = height / 2

        const deltaX = x - cx
        const deltaY = y - cy

        //parametric deg
        const handleAngle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
        const { start, end } = scene.getArcAngles()
        if (scene.isArc()) {
            console.log('inside ')
            const Angle = this.clampAngleToArc(handleAngle, start, end, this.handleRatioAngle)
            this.handleRatioAngle = Angle
        } else {
            this.handleRatioAngle = handleAngle
        }

        const ratio = this.calculateRatioFromMousePosition({ x, y }, cx, cy, width, height)
        scene.setRatio(ratio)
    }

    updateStarRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const { x, y } = scene.getCenterCoord()
        const { width, height } = scene.getDim()

        const ratio = this.calculateRatioFromMousePosition(e, x, y, width, height)

        scene.setRatio(ratio)
    }

    updateShapeArc(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        if (this.pos == 'arc-end') {
            this.updateShapeArcEnd(dx, dy, e, scene)
        } else {
            this.updateShapeArcStart(dx, dy, e, scene)
        }
    }

    updateShapeArcStart(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const { x, y } = scene.getCenterCoord()
        const { width, height } = scene.getDim()
        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y
        const radiusX = width / 2
        const radiusY = height / 2
        const { start, end } = scene.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)

        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI
        const delta = angle - start

        scene.setArc(start + delta, end + delta)
    }

    updateShapeArcEnd(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const { x, y } = scene.getCenterCoord()
        const { width, height } = scene.getDim()
        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y
        const radiusX = width / 2
        const radiusY = height / 2
        const { start } = scene.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI

        let sweep = angle - start
        if (sweep <= 0) sweep += 2 * Math.PI

        scene.setArc(start, start + sweep)
    }

    updateShapeVertices(x: number, y: number, scene: SceneNode) {
        const GAP = 10 // defined distance for both x and y
        const count = scene.getVertexCount()

        const next = clamp(count + 1, 3, 60)
        const prev = clamp(count - 1, 3, 60)

        const vertex = scene.getShapeType() === 'star' ? 2 : 1

        const { x: px, y: py } = scene.getVertex(prev, vertex)
        const { x: nx, y: ny } = scene.getVertex(next, vertex)
        if (y < ny && (Math.abs(x - nx) < GAP || Math.abs(y - ny) < GAP)) {
            scene.setVertexCount(next)
        } else if (y > py && (Math.abs(x - px) < GAP || Math.abs(y - py) < GAP)) {
            scene.setVertexCount(prev)
        }
    }

    shapeAngleOnMouseDown(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
        const Matrix = this.resource.canvasKit.Matrix
        const center = Matrix.mapPoints(initialShapeData.worldTransform, [
            initialShapeData.dimension.width * initialShapeData.rotationAnchor.x,
            initialShapeData.dimension.height * initialShapeData.rotationAnchor.y,
        ])

        const initialMouseAngle = Math.atan2(e.offsetY - center[1], e.offsetX - center[0])
        initialShapeData.initialMouseAngle = initialMouseAngle
    }

    updateShapeAngle(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
        if (!scene) return
        const Matrix = this.resource.canvasKit.Matrix
        const center = Matrix.mapPoints(initialShapeData.worldTransform, [
            initialShapeData.dimension.width * initialShapeData.rotationAnchor.x,
            initialShapeData.dimension.height * initialShapeData.rotationAnchor.y,
        ])

        const currentMouseAngle = Math.atan2(e.offsetY - center[1], e.offsetX - center[0])

        const startMouseAngle = initialShapeData.initialMouseAngle ?? currentMouseAngle
        const delta = currentMouseAngle - startMouseAngle
        const baseRotation = initialShapeData.rotation

        scene.setAngle(baseRotation + delta)
    }

    createPaint() {
        if (!this.resource) return
        const cnvsKit = this.resource

        const fill = Array.isArray(this.fill) ? this.fill : cnvsKit.canvasKit.parseColorString(this.fill)
        const strokeColor = Array.isArray(this.stroke) ? this.stroke : cnvsKit.canvasKit.parseColorString(this.stroke)

        cnvsKit.paint.setColor(fill)

        cnvsKit.strokePaint.setColor(strokeColor)
        cnvsKit.strokePaint.setStrokeWidth(1)

        return { fill: this.resource.paint, stroke: this.resource.strokePaint }
    }

    drawRect(canvas: Canvas) {
        const { fill, stroke } = this.createPaint()
        const rect = this.resource.canvasKit.XYWHRect(this.x, this.y, this.size, this.size)
        canvas.drawRect(rect, fill)
        canvas.drawRect(rect, stroke)
    }

    // Draw a small oval at (x, y)
    drawOval(canvas: Canvas) {
        const { fill, stroke } = this.createPaint()
        const ovalRect = this.resource.canvasKit.LTRBRect(this.x, this.y, this.x + this.size * 2, this.y + this.size * 2)
        canvas.drawOval(ovalRect, fill)
        canvas.drawOval(ovalRect, stroke)
    }

    draw(canvas: Canvas) {
        if (this.type !== 'size' && this.type !== 'angle') {
            this.drawOval(canvas)
        } else {
            this.drawRect(canvas)
        }
    }
}
