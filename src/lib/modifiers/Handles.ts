// Handle.ts
import type { Canvas } from 'canvaskit-wasm'
import { HandlePos, HandleType } from '@lib/types/shapes'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import clamp from '@lib/helper/clamp'
import SceneNode from '@lib/node/ContainerNode'

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
    private anchorPoint: { x: number; y: number } | null = null

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

    private calculateRatioFromMousePosition(e: MouseEvent, centerX: number, centerY: number, width: number, height: number): number {
        const deltaX = e.offsetX - centerX
        const deltaY = e.offsetY - centerY
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

    updateShapeRadii(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const { left, right, top, bottom } = scene.getShape().getBoundingRect()

        let cornerX: number,
            cornerY: number,
            distX: number,
            distY: number,
            newRadius = 0

        switch (this.pos) {
            case 'top-left':
                cornerX = left
                cornerY = top
                distX = e.offsetX - cornerX
                distY = e.offsetY - cornerY
                if (distX >= 0 && distY >= 0) {
                    newRadius = Math.min(distX, distY)
                }
                break
            case 'top-right':
                cornerX = right
                cornerY = top
                distX = e.offsetX - cornerX
                distY = e.offsetY - cornerY
                if (distX <= 0 && distY >= 0) {
                    newRadius = Math.min(Math.abs(distX), distY)
                }
                break
            case 'bottom-left':
                cornerX = left
                cornerY = bottom
                distX = e.offsetX - cornerX
                distY = e.offsetY - cornerY
                if (distX >= 0 && distY <= 0) {
                    newRadius = Math.min(distX, Math.abs(distY))
                }
                break
            case 'bottom-right':
                cornerX = right
                cornerY = bottom
                distX = e.offsetX - cornerX
                distY = e.offsetY - cornerY
                if (distX <= 0 && distY <= 0) {
                    newRadius = Math.min(Math.abs(distX), Math.abs(distY))
                }
                break
            case 'top':
                cornerY = top
                distY = e.offsetY - cornerY
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

    updateShapeDim(mx: number, my: number, scene: SceneNode) {
        let [width, height] = [0, 0]
        let localx = 0
        let localy = 0

        const shape = scene.getShape()
        const { width: currentWidth, height: currentHeight } = shape.getDim()

        if (this.anchorPoint === null) {
            const anchorMap = {
                'top-left': { x: currentWidth, y: currentHeight },
                'top-right': { x: 0, y: currentHeight },
                'bottom-left': { x: currentWidth, y: 0 },
                'bottom-right': { x: 0, y: 0 },
                top: { x: 0, y: currentHeight },
                bottom: { x: 0, y: 0 },
                left: { x: currentWidth, y: 0 },
                right: { x: 0, y: 0 },
            }
            this.anchorPoint = anchorMap[this.pos]
        }

        let isFlippedX = false,
            isFlippedY = false

        switch (this.pos) {
            // Corners: change both width and height
            case 'top-left':
            case 'top-right':
            case 'bottom-left':
            case 'bottom-right': {
                const flipMap = {
                    'top-left': {
                        isFlippedX: mx > this.anchorPoint.x,
                        isFlippedY: my > this.anchorPoint.y,
                    },
                    'top-right': {
                        isFlippedX: mx < this.anchorPoint.x,
                        isFlippedY: my > this.anchorPoint.y,
                    },
                    'bottom-left': {
                        isFlippedX: mx > this.anchorPoint.x,
                        isFlippedY: my < this.anchorPoint.y,
                    },
                    'bottom-right': {
                        isFlippedX: mx < this.anchorPoint.x,
                        isFlippedY: my < this.anchorPoint.y,
                    },
                }
                ;({ isFlippedX, isFlippedY } = flipMap[this.pos])

                width = Math.abs(mx - this.anchorPoint.x)
                height = Math.abs(my - this.anchorPoint.y)
                localx = Math.min(this.anchorPoint.x, mx)
                localy = Math.min(this.anchorPoint.y, my)
                break
            }

            // Sides: change only one dimension
            case 'top': {
                isFlippedY = my > this.anchorPoint.y
                // keep width and x fixed
                localx = 0
                localy = Math.min(this.anchorPoint.y, my)
                width = currentWidth
                height = Math.abs(my - this.anchorPoint.y)
                break
            }
            case 'bottom': {
                isFlippedY = my < this.anchorPoint.y
                localx = 0
                localy = Math.min(this.anchorPoint.y, my)
                width = currentWidth
                height = Math.abs(my - this.anchorPoint.y)
                break
            }
            case 'left': {
                isFlippedX = mx > this.anchorPoint.x
                // keep height and y fixed
                localy = 0
                localx = Math.min(this.anchorPoint.x, mx)
                height = currentHeight
                width = Math.abs(mx - this.anchorPoint.x)
                break
            }
            case 'right': {
                isFlippedX = mx < this.anchorPoint.x
                localy = 0
                localx = Math.min(this.anchorPoint.x, mx)
                height = currentHeight
                width = Math.abs(mx - this.anchorPoint.x)
                break
            }
        }

        scene.setFlip(isFlippedX, isFlippedY)
        scene.setPosition(nx, ny)
        scene.setDimension(width, height)
    }

    clampAngleToArc(t: number, start: number, end: number, prev: number): number {
        const TWO_PI = 2 * Math.PI

        const t0 = t < 0 ? t + TWO_PI : t

        if (t0 < start) return prev
        if (t0 > end) return prev
        return t0
    }

    updateOvalRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        const { x, y } = shape.getCenterCoord()
        const { width, height } = shape.getDim()

        const radiusX = width / 2
        const radiusY = height / 2

        const deltaX = e.offsetX - x
        const deltaY = e.offsetY - y

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

        const ratio = this.calculateRatioFromMousePosition(e, x, y, width, height)
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

    updateShapeVertices(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        const GAP = 10 // defined distance for both x and y
        const count = shape.getVertexCount()

        const next = clamp(count + 1, 3, 60)
        const prev = clamp(count - 1, 3, 60)

        const vertex = shape.getShapeType() === 'star' ? 2 : 1

        const { x: px, y: py } = shape.getVertex(prev, vertex)
        const { x: nx, y: ny } = shape.getVertex(next, vertex)
        if (e.offsetY < ny && (Math.abs(e.offsetX - nx) < GAP || Math.abs(e.offsetY - ny) < GAP)) {
            shape.setVertexCount(next)
        } else if (e.offsetY > py && (Math.abs(e.offsetX - px) < GAP || Math.abs(e.offsetY - py) < GAP)) {
            shape.setVertexCount(prev)
        }
    }

    updateShapeAngle(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
        const shape = scene.getShape()
        if (!shape) return

        //work on this
        const { x, y } = shape.getCenterCoord()
        let { transform } = shape.getProperties()
        if (!transform.anchorPoint) {
            shape.setAnchorPoint({ x, y })
        }

        ;({ transform } = shape.getProperties())

        const cx = transform.anchorPoint.x
        const cy = transform.anchorPoint.y

        // Angle in radians
        const angle = Math.atan2(e.offsetY - cy, e.offsetX - cx)

        scene.setAngle(angle)
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
