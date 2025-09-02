import clamp from '@lib/helper/clamp'
import { getOppositeHandle, getHandleLocalPoint } from '@lib/helper/handleUtil'
import SceneNode from '@lib/node/Scene'
import { Coord } from '@lib/types/shapes'
import { ShapeData } from './modifier'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import Handle from './Handles'

function resource(): CanvasKitResources {
    const resources = CanvasKitResources.getInstance()

    if (resources) {
        return resources
    } else {
        console.log('resources is null')

        return null
    }
}

export function calculateRatioFromMousePosition(e: Coord, centerX: number, centerY: number, width: number, height: number): number {
    const deltaX = e.x - centerX
    const deltaY = e.y - centerY
    const radiusX = width / 2
    const radiusY = height / 2

    const deg = Math.atan2(deltaY, deltaX)
    const cos = Math.cos(deg)
    const sin = Math.sin(deg)

    const ellipseRadiusAtAngle = Math.sqrt((radiusX * radiusX * radiusY * radiusY) / (radiusY * radiusY * cos * cos + radiusX * radiusX * sin * sin))

    const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const ratio = Math.min(0.99, distanceFromCenter / ellipseRadiusAtAngle)

    return ratio
}

export function updateShapeRadii(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
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

    switch (handle.pos) {
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

export function updateShapeDim(handle: Handle, dragStart: Coord, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const Matrix = resource().canvasKit.Matrix
    const localStart = Matrix.mapPoints(initialShapeData.inverseWorldTransform, [dragStart.x, dragStart.y])
    const localCurrent = Matrix.mapPoints(initialShapeData.inverseWorldTransform, [e.offsetX, e.offsetY])

    let newWidth = initialShapeData.dimension.width
    let newHeight = initialShapeData.dimension.height

    const dx = localCurrent[0] - localStart[0]
    const dy = localCurrent[1] - localStart[1]

    switch (handle.pos) {
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

    const fixedHandleKey = getOppositeHandle(handle.pos)
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

    scene.updateScene({
        position: { x: Math.floor(posX), y: Math.floor(posY) },
        scale: { x: desiredScaleX, y: desiredScaleY },
        dimension: { width: absW, height: absH },
    })
}

export function clampAngleToArc(t: number, start: number, end: number, prev: number): number {
    const TWO_PI = 2 * Math.PI

    const t0 = t < 0 ? t + TWO_PI : t

    if (t0 < start) return prev
    if (t0 > end) return prev
    return t0
}

export function updateOvalRatio(x: number, y: number, scene: SceneNode) {
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

    const ratio = calculateRatioFromMousePosition({ x, y }, cx, cy, width, height)
    scene.setRatio(ratio)
}

export function updateStarRatio(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
    const { x, y } = scene.getCenterCoord()
    const { width, height } = scene.getDim()

    const ratio = calculateRatioFromMousePosition(e, x, y, width, height)

    scene.setRatio(ratio)
}

export function updateShapeArc(handle: Handle, dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
    if (handle.pos == 'arc-end') {
        updateShapeArcEnd(dx, dy, e, scene)
    } else {
        updateShapeArcStart(dx, dy, e, scene)
    }
}

function updateShapeArcStart(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
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

function updateShapeArcEnd(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
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

export function updateShapeVertices(dx: number, dy: number, e: MouseEvent, scene: SceneNode) {
    const GAP = 10 // defined distance for both x and y
    const count = scene.getVertexCount()
    const { x, y } = { x: e.offsetX, y: e.offsetY }

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

export function shapeAngleOnMouseDown(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const Matrix = resource().canvasKit.Matrix
    const center = Matrix.mapPoints(initialShapeData.worldTransform, [
        initialShapeData.dimension.width * initialShapeData.rotationAnchor.x,
        initialShapeData.dimension.height * initialShapeData.rotationAnchor.y,
    ])

    const initialMouseAngle = Math.atan2(e.offsetY - center[1], e.offsetX - center[0])
    initialShapeData.initialMouseAngle = initialMouseAngle
}

export function updateShapeAngle(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    if (!scene) return
    const Matrix = resource().canvasKit.Matrix
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
