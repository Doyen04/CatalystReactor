import clamp from '@lib/helper/clamp'
import { getOppositeHandle, getHandleLocalPoint } from '@lib/helper/handleUtil'
import SceneNode from '@lib/node/Scene'
import { ArcHandleState, Coord } from '@lib/types/shapes'
import { ShapeData } from './modifier'
import CanvasKitResources from '@lib/core/CanvasKitResource'
import Handle from './Handles'
import { normalizeAngle } from '@lib/helper/normalise'

function resource(): CanvasKitResources {
    const resources = CanvasKitResources.getInstance()

    if (resources) {
        return resources
    } else {
        console.log('resources is null')

        return null
    }
}

function tranformPoint(matrix: number[], x: number, y: number) {
    const Matrix = resource().canvasKit.Matrix
    const localCurrent = Matrix.mapPoints(matrix, [x, y])
    return { x: localCurrent[0], y: localCurrent[1] }
}

export function updateShapeRadii(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const { left, right, top, bottom } = scene.getLocalBoundingRect()
    const { x, y } = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

    let cornerX: number,
        cornerY: number,
        distX: number,
        distY: number,
        newRadius = 0

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
    scene.setBorderRadius(newRadius, handle.pos)
}

export function updateShapeDim(handle: Handle, dragStart: Coord, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const localStart = tranformPoint(initialShapeData.inverseWorldTransform, dragStart.x, dragStart.y)
    const localCurrent = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

    let newWidth = initialShapeData.dimension.width
    let newHeight = initialShapeData.dimension.height

    const dx = localCurrent.x - localStart.x
    const dy = localCurrent.y - localStart.y

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
    const fixedWorld = tranformPoint(initialShapeData.localTransform, fixedLocal.x, fixedLocal.y)
    const handleNewLocal = getHandleLocalPoint(fixedHandleKey, absW, absH)

    const zeroTransform = scene.buildZeroTransform(
        absW,
        absH,
        initialShapeData.rotation,
        { x: desiredScaleX, y: desiredScaleY },
        initialShapeData.rotationAnchor
    )

    const offset = tranformPoint(zeroTransform, handleNewLocal.x, handleNewLocal.y)
    const posX = (fixedWorld ? fixedWorld.x : initialShapeData.position.x) - offset.x
    const posY = (fixedWorld ? fixedWorld.y : initialShapeData.position.y) - offset.y

    scene.updateScene({
        position: { x: Math.floor(posX), y: Math.floor(posY) },
        scale: { x: desiredScaleX, y: desiredScaleY },
        dimension: { width: absW, height: absH },
    })
}

function clampAngleToArc(t: number, start: number, end: number, prev: number): number {
    t = normalizeAngle(t)
    start = normalizeAngle(start)
    end = normalizeAngle(end)

    const check = () => {
        if (start <= end) {
            return start <= t && t <= end
        } else {
            return t >= start || t <= end
        }
    }

    if (!check()) return prev
    return t
}

function calculateRatioFromMousePosition(e: Coord, centerX: number, centerY: number, width: number, height: number): number {
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

export function updateOvalRatio(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const localCurrent = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

    const { width, height } = scene.getDim()

    const radiusX = width / 2
    const radiusY = height / 2

    const deltaX = localCurrent.x - radiusX
    const deltaY = localCurrent.y - radiusY

    // //parametric deg
    let handleAngle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
    handleAngle = normalizeAngle(handleAngle)

    const { start, end } = scene.getArcAngles()
    if (scene.isArc()) {
        const Angle = clampAngleToArc(handleAngle, start, end, handle.handleRatioAngle)
        handle.handleRatioAngle = Angle
    } else {
        handle.handleRatioAngle = handleAngle
    }

    const ratio = calculateRatioFromMousePosition({ x: localCurrent.x, y: localCurrent.y }, radiusX, radiusY, width, height)
    scene.setRatio(ratio)
}

export function updateStarRatio(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const localCurrent = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)
    const { width, height } = scene.getDim()

    const radiusX = width / 2
    const radiusY = height / 2

    const ratio = calculateRatioFromMousePosition({ x: localCurrent.x, y: localCurrent.y }, radiusX, radiusY, width, height)

    scene.setRatio(ratio)
}

export function updateShapeArc(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    if (handle.pos == 'arc-end') {
        updateShapeArcEnd(handle, e, scene, initialShapeData)
    } else {
        updateShapeArcStart(handle, e, scene, initialShapeData)
    }
}

function updateShapeArcStart(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const localCurrent = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

    const { width, height } = scene.getDim()
    const radiusX = width / 2
    const radiusY = height / 2
    const cx = radiusX
    const cy = radiusY

    const deltaX = localCurrent.x - cx
    const deltaY = localCurrent.y - cy

    let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
    angle = normalizeAngle(angle)

    const sweep = scene.getSweep()

    const arcState = scene.getArcHandleState() ?? {}

    const baseSweep = arcState.dragSweep ?? sweep

    const newStart = angle
    const newEnd = newStart + baseSweep

    const currentState = ensureArcEndState(scene.getArcHandleState(), newEnd, newStart, baseSweep)
    scene.setArcHandleState(currentState)

    const ratio = calculateRatioFromMousePosition({ x: localCurrent.x, y: localCurrent.y }, radiusX, radiusY, width, height)
    handle.handleRatioFromCenter = ratio

    scene.setArc(normalizeAngle(newStart), normalizeAngle(newEnd))
}

const resolveArcEndSweep = (state: ArcHandleState, pointerAngle: number, anchorAngle: number): { state: ArcHandleState } => {
    const diffCW = normalizeAngle(pointerAngle - anchorAngle)
    const TWO_PI = 2 * Math.PI
    const prevDiff = state.dragSweep ?? state.dragLastDiff ?? diffCW
    const SWEEP_LIMIT = 2 * Math.PI - 1e-4

    anchorAngle = state.dragSweep ? pointerAngle - state.dragSweep : anchorAngle

    let pointerDelta = pointerAngle - (state.dragPrevPointer ?? pointerAngle)
    if (pointerDelta > Math.PI) pointerDelta -= TWO_PI
    if (pointerDelta < -Math.PI) pointerDelta += TWO_PI

    let dragDirection = state.dragDirection ?? 1
    console.log(dragDirection, 'dragdirection')

    if (pointerDelta > 0 && diffCW < prevDiff) {
        dragDirection = -dragDirection
    } else if (pointerDelta < 0 && diffCW > prevDiff) {
        dragDirection = -dragDirection
    }
    const sweepCandidate = state.dragDirection >= 0 ? diffCW : diffCW - TWO_PI
    const sweep = clamp(sweepCandidate, -SWEEP_LIMIT, SWEEP_LIMIT)

    const nextState: ArcHandleState = {
        ...state,
        dragDirection,
        dragLastDiff: diffCW,
        dragPrevPointer: pointerAngle,
        dragSweep: sweep,
    }
    return { state: nextState }
}

const ensureArcEndState = (state: ArcHandleState | null, pointerAngle: number, anchorAngle: number, initialSweep: number): ArcHandleState => {
    if (state?.dragDirection !== undefined) {
        return state
    }
    return {
        ...(state ?? {}),
        dragDirection: initialSweep >= 0 ? 1 : -1,
        dragLastDiff: normalizeAngle(pointerAngle - anchorAngle),
        dragPrevPointer: pointerAngle,
    }
}

function updateShapeArcEnd(handle: Handle, e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const localCurrent = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

    const { width, height } = scene.getDim()
    const radiusX = width / 2
    const radiusY = height / 2
    const cx = radiusX
    const cy = radiusY

    const deltaX = localCurrent.x - cx
    const deltaY = localCurrent.y - cy

    const { start } = initialShapeData.arcAngle

    let angle = Math.atan2(radiusX * deltaY, radiusY * deltaX)
    angle = normalizeAngle(angle)
    const pointerAngle = angle

    const arcState = scene.getArcHandleState() ?? {}
    console.log(arcState, 'arcstate')

    const baseSweep = arcState.dragSweep ?? angle - start

    const currentState = ensureArcEndState(scene.getArcHandleState(), pointerAngle, start, baseSweep)
    console.log(baseSweep, currentState)

    const { state: nextState } = resolveArcEndSweep(currentState, pointerAngle, start)

    scene.setArcHandleState(nextState)

    const ratio = calculateRatioFromMousePosition({ x: localCurrent.x, y: localCurrent.y }, radiusX, radiusY, width, height)
    handle.handleRatioFromCenter = ratio

    scene.setArc(start, angle)
}

export function updateShapeVertices(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    const GAP = 10 // defined distance for both x and y
    const count = scene.getVertexCount()
    const { x, y } = tranformPoint(initialShapeData.inverseWorldTransform, e.offsetX, e.offsetY)

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

export function updateShapeAngle(e: MouseEvent, scene: SceneNode, initialShapeData: ShapeData) {
    if (!scene) return

    const center = tranformPoint(
        initialShapeData.worldTransform,
        initialShapeData.dimension.width * initialShapeData.rotationAnchor.x,
        initialShapeData.dimension.height * initialShapeData.rotationAnchor.y
    )

    const currentMouseAngle = Math.atan2(e.offsetY - center.y, e.offsetX - center.x)

    const startMouseAngle = initialShapeData.initialMouseAngle ?? currentMouseAngle
    const delta = currentMouseAngle - startMouseAngle
    const baseRotation = initialShapeData.rotation

    scene.setAngle(baseRotation + delta)
}
