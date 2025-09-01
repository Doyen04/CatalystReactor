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
    private anchorPoint: Record<string, { x: number; y: number }> | null = null

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

    resetAnchorPoint() {
        this.anchorPoint = null
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

    // updateShapeDim(x: number, y: number, scene: SceneNode) {
    //     let [width, height] = [0, 0]
    //     let nx = 0
    //     let ny = 0

    //     const boundingRect = scene.getShape().getBoundingRect()

    //     if (this.anchorPoint === null) {
    //         const anchorMap = {
    //             'top-left': { x: boundingRect.right, y: boundingRect.bottom },
    //             'top-right': { x: boundingRect.left, y: boundingRect.bottom },
    //             'bottom-left': { x: boundingRect.right, y: boundingRect.top },
    //             'bottom-right': { x: boundingRect.left, y: boundingRect.top },
    //             top: { x: boundingRect.left, y: boundingRect.bottom },
    //             bottom: { x: boundingRect.left, y: boundingRect.top },
    //             left: { x: boundingRect.right, y: boundingRect.top },
    //             right: { x: boundingRect.left, y: boundingRect.top },
    //         }
    //         this.anchorPoint = anchorMap[this.pos]
    //     }

    //     let isFlippedX = false,
    //         isFlippedY = false

    //     switch (this.pos) {
    //         // Corners: change both width and height
    //         case 'top-left':
    //         case 'top-right':
    //         case 'bottom-left':
    //         case 'bottom-right': {
    //             const flipMap = {
    //                 'top-left': {
    //                     isFlippedX: x > this.anchorPoint.x,
    //                     isFlippedY: y > this.anchorPoint.y,
    //                 },
    //                 'top-right': {
    //                     isFlippedX: x < this.anchorPoint.x,
    //                     isFlippedY: y > this.anchorPoint.y,
    //                 },
    //                 'bottom-left': {
    //                     isFlippedX: x > this.anchorPoint.x,
    //                     isFlippedY: y < this.anchorPoint.y,
    //                 },
    //                 'bottom-right': {
    //                     isFlippedX: x < this.anchorPoint.x,
    //                     isFlippedY: y < this.anchorPoint.y,
    //                 },
    //             }
    //             ;({ isFlippedX, isFlippedY } = flipMap[this.pos])

    //             width = Math.abs(x - this.anchorPoint.x)
    //             height = Math.abs(y - this.anchorPoint.y)
    //             nx = Math.min(this.anchorPoint.x, x)
    //             ny = Math.min(this.anchorPoint.y, y)
    //             break
    //         }

    //         // Sides: change only one dimension
    //         case 'top': {
    //             isFlippedY = y > this.anchorPoint.y
    //             // keep width and x fixed
    //             nx = boundingRect.left
    //             ny = Math.min(this.anchorPoint.y, y)
    //             width = boundingRect.right - boundingRect.left
    //             height = Math.abs(y - this.anchorPoint.y)
    //             break
    //         }
    //         case 'bottom': {
    //             isFlippedY = y < this.anchorPoint.y
    //             nx = boundingRect.left
    //             ny = Math.min(this.anchorPoint.y, y)
    //             width = boundingRect.right - boundingRect.left
    //             height = Math.abs(y - this.anchorPoint.y)
    //             break
    //         }
    //         case 'left': {
    //             isFlippedX = x > this.anchorPoint.x
    //             // keep height and y fixed
    //             ny = boundingRect.top
    //             nx = Math.min(this.anchorPoint.x, x)
    //             height = boundingRect.bottom - boundingRect.top
    //             width = Math.abs(x - this.anchorPoint.x)
    //             break
    //         }
    //         case 'right': {
    //             isFlippedX = x < this.anchorPoint.x
    //             ny = boundingRect.top
    //             nx = Math.min(this.anchorPoint.x, x)
    //             height = boundingRect.bottom - boundingRect.top
    //             width = Math.abs(x - this.anchorPoint.x)
    //             break
    //         }
    //     }

    //     scene.setFlip(isFlippedX, isFlippedY)
    //     const { x: mx, y: my } = scene.getRelativePosition(nx, ny)
    //     scene.setPosition(mx, my)
    //     scene.setDimension(width, height)
    // }

    updateShapeDim(x: number, y: number, scene: SceneNode) {
        const boundingRect = scene.getBoundingUnrotatedAbsoluteRect()

        if (this.anchorPoint === null) {
            const anchorMap: Record<string, { x: number; y: number }> = {
                'top-left': { x: boundingRect.right, y: boundingRect.bottom },
                'top-right': { x: boundingRect.left, y: boundingRect.bottom },
                'bottom-left': { x: boundingRect.right, y: boundingRect.top },
                'bottom-right': { x: boundingRect.left, y: boundingRect.top },
                top: { x: boundingRect.left, y: boundingRect.bottom },
                bottom: { x: boundingRect.left, y: boundingRect.top },
                left: { x: boundingRect.right, y: boundingRect.top },
                right: { x: boundingRect.left, y: boundingRect.top },
                'shape-top-left': { x: boundingRect.left, y: boundingRect.top },
                'shape-bottom-right': { x: boundingRect.right, y: boundingRect.bottom },
            }

            this.anchorPoint = anchorMap
        }

        ;({ x, y } = scene.unrotateToLocal(x, y))

        let width,
            height,
            nx,
            ny = 0

        const anchor = this.anchorPoint[this.pos]

        switch (this.pos) {
            case 'top-left':
                width = anchor.x - x
                height = anchor.y - y
                nx = width < 0 ? anchor.x : anchor.x - width
                ny = height < 0 ? anchor.y : anchor.y - height
                break

            case 'top-right':
                width = x - anchor.x
                height = anchor.y - y
                nx = width < 0 ? anchor.x + width : anchor.x
                ny = height < 0 ? anchor.y : anchor.y - height
                break

            case 'bottom-left':
                width = anchor.x - x
                height = y - anchor.y
                nx = width < 0 ? anchor.x : anchor.x - width
                ny = height < 0 ? anchor.y + height : anchor.y
                break

            case 'bottom-right':
                width = x - anchor.x
                height = y - anchor.y
                nx = width < 0 ? anchor.x + width : anchor.x
                ny = height < 0 ? anchor.y + height : anchor.y
                break

            case 'top':
                width = boundingRect['left'] - boundingRect['right']
                height = anchor.y - y
                nx = boundingRect['left']
                ny = height < 0 ? anchor.y : anchor.y - height
                break

            case 'bottom':
                width = boundingRect['left'] - boundingRect['right']
                height = y - anchor.y
                nx = boundingRect['left']
                ny = height < 0 ? anchor.y + height : anchor.y
                break

            case 'left':
                width = anchor.x - x
                height = boundingRect['top'] - boundingRect['bottom']
                nx = width < 0 ? anchor.x : anchor.x - width
                ny = boundingRect['top']
                break

            case 'right':
                width = x - anchor.x
                height = boundingRect['top'] - boundingRect['bottom']
                nx = width < 0 ? anchor.x + width : anchor.x
                ny = boundingRect['top']
                break
        }

        console.log(x, y, this.anchorPoint, nx, ny, 'rew', width, height, this.pos, 'insideresize')

        scene.updateScene({
            position: { x: nx, y: ny },
            dimension: { width, height },
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
        const { x: sx, y: sy } = shape.getCoord()
        const prevAngle = scene.getAngle()

        const ax = rx + sx
        const ay = ry + sy

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
