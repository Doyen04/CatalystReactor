// Handle.ts
import type { Canvas } from 'canvaskit-wasm'
import { Coord, HandlePos, HandleType } from '@lib/types/shapes'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import clamp from '@lib/helper/clamp'
import SceneNode from '@lib/node/Scene'

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

    updateShapeRadii(x: number, y: number, scene: SceneNode) {
        const { left, right, top, bottom } = scene.getShape().getBoundingRect()

        console.log(left, right, top, bottom, x, y)

        let cornerX: number,
            cornerY: number,
            distX: number,
            distY: number,
            newRadius = 0

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
        scene.getShape().setBorderRadius(newRadius, this.pos)
    }

    updateShapeDim(dragStart: Coord, e: MouseEvent, scene: SceneNode, initialProps) {
        const Matrix = this.resource.canvasKit.Matrix
        const localStart = Matrix.mapPoints(initialProps.inverseWorldTransform, [dragStart.x, dragStart.y])
        const localCurrent = Matrix.mapPoints(initialProps.inverseWorldTransform, [e.offsetX, e.offsetY])

        let newWidth = initialProps.dimension.width
        let newHeight = initialProps.dimension.height

        const dx = localCurrent[0] - localStart[0]
        const dy = localCurrent[1] - localStart[1]

        console.log(localStart, localCurrent, dx, dy)

        switch (this.pos) {
            case 'top-left':
                newWidth = initialProps.dimension.width - dx
                newHeight = initialProps.dimension.height - dy
                break
            case 'top-right':
                newWidth = initialProps.dimension.width + dx
                newHeight = initialProps.dimension.height - dy
                break
            case 'bottom-left':
                newWidth = initialProps.dimension.width - dx
                newHeight = initialProps.dimension.height + dy
                break
            case 'bottom-right':
                newWidth = initialProps.dimension.width + dx
                newHeight = initialProps.dimension.height + dy
                break
            case 'top':
                newHeight = initialProps.dimension.height - dy
                break
            case 'bottom':
                newHeight = initialProps.dimension.height + dy
                break
            case 'left':
                newWidth = initialProps.dimension.width - dx
                break
            case 'right':
                newWidth = initialProps.dimension.width + dx
                break
        }

        const MIN_SIZE = 2
        const willFlipX = newWidth < 0
        const willFlipY = newHeight < 0
        const absW = Math.max(MIN_SIZE, Math.abs(newWidth))
        const absH = Math.max(MIN_SIZE, Math.abs(newHeight))

        const desiredScaleX = willFlipX ? -Math.sign(initialProps.scale.x || 1) : Math.sign(initialProps.scale.x || 1)
        const desiredScaleY = willFlipY ? -Math.sign(initialProps.scale.y || 1) : Math.sign(initialProps.scale.y || 1)

        const fixedHandleKey = this.getOppositeHandle(this.pos)
        const fixedLocal = this.getHandleLocalPoint(fixedHandleKey, initialProps.dimension.width, initialProps.dimension.height)
        const fixedWorld = Matrix.mapPoints(initialProps.worldTransform, [fixedLocal.x, fixedLocal.y])
        const handleNewLocal = this.getHandleLocalPoint(fixedHandleKey, absW, absH)

        const zeroTransform = scene.buildZeroTransform(
            absW,
            absH,
            initialProps.rotation,
            { x: desiredScaleX, y: desiredScaleY },
            initialProps.rotationAnchor
        )

        const offset = scene.toZeroTransform(zeroTransform, handleNewLocal.x, handleNewLocal.y)
        const posX = (fixedWorld ? fixedWorld[0] : initialProps.position.x) - offset.x
        const posY = (fixedWorld ? fixedWorld[1] : initialProps.position.y) - offset.y

        scene.updateScene({
            position: { x: posX, y: posY },
            scale: { x: desiredScaleX, y: desiredScaleY },
            dimension: { width: absW, height: absH },
        })
    }

    getOppositeHandle(pos: HandlePos) {
        const map = {
            'top-left': 'bottom-right',
            'top-right': 'bottom-left',
            'bottom-left': 'top-right',
            'bottom-right': 'top-left',
            top: 'bottom',
            bottom: 'top',
            left: 'right',
            right: 'left',
        }
        return map[pos] || 'bottom-right'
    }

    getHandleLocalPoint(pos: HandlePos, width: number, height: number) {
        switch (pos) {
            case 'top-left':
                return { x: 0, y: 0 }
            case 'top-right':
                return { x: width, y: 0 }
            case 'bottom-left':
                return { x: 0, y: height }
            case 'bottom-right':
                return { x: width, y: height }
            case 'top':
                return { x: width / 2, y: 0 }
            case 'bottom':
                return { x: width / 2, y: height }
            case 'left':
                return { x: 0, y: height / 2 }
            case 'right':
                return { x: width, y: height / 2 }
            default:
                return { x: width, y: height }
        }
    }

    clampAngleToArc(t: number, start: number, end: number, prev: number): number {
        const TWO_PI = 2 * Math.PI

        const t0 = t < 0 ? t + TWO_PI : t

        if (t0 < start) return prev
        if (t0 > end) return prev
        return t0
    }

    updateOvalRatio(x: number, y: number, scene: SceneNode) {
        const shape = scene.getShape()
        const { x: cx, y: cy } = shape.getCenterCoord()
        const { width, height } = shape.getDim()

        const radiusX = width / 2
        const radiusY = height / 2

        const deltaX = x - cx
        const deltaY = y - cy

        //parametric deg
        const handleAngle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
        const { start, end } = shape.getArcAngles()
        if (shape.isArc()) {
            console.log('inside ')
            const Angle = this.clampAngleToArc(handleAngle, start, end, this.handleRatioAngle)
            this.handleRatioAngle = Angle
        } else {
            this.handleRatioAngle = handleAngle
        }

        const ratio = this.calculateRatioFromMousePosition({ x, y }, cx, cy, width, height)
        shape.setRatio(ratio)
    }

    updateStarRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()

        const ratio = this.calculateRatioFromMousePosition(e, x, y, width, height)

        shape.setRatio(ratio)
    }

    updateShapeArc(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        if (this.pos == 'arc-end') {
            this.updateShapeArcEnd(dx, dy, e, scene)
        } else {
            this.updateShapeArcStart(dx, dy, e, scene)
        }
    }

    updateShapeArcStart(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()
        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y
        const radiusX = width / 2
        const radiusY = height / 2
        const { start, end } = shape.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)

        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI
        const delta = angle - start

        shape.setArc(start + delta, end + delta)
    }

    updateShapeArcEnd(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()
        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y
        const radiusX = width / 2
        const radiusY = height / 2
        const { start } = shape.getArcAngles()

        //parametric deg
        let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
        // Normalize angle to 0-2π range
        if (angle < 0) angle += 2 * Math.PI

        let sweep = angle - start
        if (sweep <= 0) sweep += 2 * Math.PI

        shape.setArc(start, start + sweep)
    }

    updateShapeVertices(x: number, y: number, scene: SceneNode) {
        const shape = scene.getShape()
        const GAP = 10 // defined distance for both x and y
        const count = shape.getVertexCount()

        const next = clamp(count + 1, 3, 60)
        const prev = clamp(count - 1, 3, 60)

        const vertex = shape.getShapeType() === 'star' ? 2 : 1

        const { x: px, y: py } = shape.getVertex(prev, vertex)
        const { x: nx, y: ny } = shape.getVertex(next, vertex)
        if (y < ny && (Math.abs(x - nx) < GAP || Math.abs(y - ny) < GAP)) {
            shape.setVertexCount(next)
        } else if (y > py && (Math.abs(x - px) < GAP || Math.abs(y - py) < GAP)) {
            shape.setVertexCount(prev)
        }
    }

    updateShapeAngle(x: number, y: number, scene: SceneNode) {
        const shape = scene.getShape()
        if (!shape) return

        const { x: rx, y: ry } = shape.getRotationAnchorPoint()
        const { width, height } = shape.getDim()
        const { x: sx, y: sy } = shape.getCoord()

        const prevAngle = scene.getAngle()

        const offsetX = rx * width
        const offsetY = ry * height

        const ax = offsetX + sx
        const ay = offsetY + sy

        // Angle in radians
        const cy = y - ay
        const cx = x - ax

        const angle = Math.atan2(cy, cx)
        // Normalize angle to 0-2π range
        const delta = angle - prevAngle

        scene.setAngle(prevAngle + delta)
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
