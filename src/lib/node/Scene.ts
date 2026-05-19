import CanvasKitResources from '@lib/core/CanvasKitResource'
import Handle from '@lib/modifiers/Handles'
import type Shape from '@lib/shapes/base/Shape'
import { ArcHandleState, BoundingRect, Coord, HandlePos, Properties, Size } from '@lib/types/shapes'
import { Canvas } from 'canvaskit-wasm'

abstract class SceneNode {
    public shape: Shape
    protected parent: SceneNode | null
    protected localMatrix: number[] | null
    protected worldMatrix: number[] | null
    protected canComputeMatrix: boolean = false

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')

            return null
        }
    }

    setUpMatrix() {
        const Matrix = this.resource.canvasKit.Matrix
        this.localMatrix = Matrix.identity()
        this.worldMatrix = Matrix.identity()
    }

    updateScene(attrib: { position: Coord; scale: Coord; dimension: Size }) {
        this.setPosition(Math.round(attrib.position.x), Math.round(attrib.position.y))
        this.setScale(attrib.scale.x, attrib.scale.y)
        this.setDimension(Math.round(Math.abs(attrib.dimension.width)), Math.round(Math.abs(attrib.dimension.height)))
    }

    setDimension(width: number, height: number): void {
        this.shape.setDim(width, height)

        this.canComputeMatrix = true
    }

    setScale(x: number, y: number): void {
        this.shape.setScale(x, y)

        this.canComputeMatrix = true
    }

    setAngle(angle: number): void {
        this.shape.setAngle(angle)

        this.canComputeMatrix = true
    }

    setPosition(x: number, y: number): void {
        this.shape.setCoord(x, y)

        this.canComputeMatrix = true
    }

    move(dx: number, dy: number): void {
        this.shape.moveShape(dx, dy)

        this.canComputeMatrix = true
    }

    setParent(parent: SceneNode) {
        this.parent = parent
    }

    drawOnDrag(dragStart: Coord, e: MouseEvent) {
        const { x: dx, y: dy } = this.worldToParentLocal(dragStart.x, dragStart.y)
        const { x: tx, y: ty } = this.worldToParentLocal(e.offsetX, e.offsetY)

        this.shape.setSize({ x: dx, y: dy }, tx, ty, e.shiftKey)

        this.canComputeMatrix = true
    }

    drawDefault() {
        this.shape.drawDefault()

        this.canComputeMatrix = true
    }

    localToWorld(dx: number, dy: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const transformedPoint = Matrix.mapPoints(this.worldMatrix, [dx, dy])
        return {
            x: Math.round(transformedPoint[0]),
            y: Math.round(transformedPoint[1]),
        }
    }

    worldToParentLocal(x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const inverseMatrix = Matrix.invert(this.parent.worldMatrix)
        const transformedPoint = Matrix.mapPoints(inverseMatrix, [x, y])
        return {
            x: Math.round(transformedPoint[0]),
            y: Math.round(transformedPoint[1]),
        }
    }

    worldToLocal(x: number, y: number) {
        const Matrix = this.resource.canvasKit.Matrix
        const inverseMatrix = Matrix.invert(this.worldMatrix)

        const transformedPoint = Matrix.mapPoints(inverseMatrix, [x, y])
        return {
            x: Math.round(transformedPoint[0]),
            y: Math.round(transformedPoint[1]),
        }
    }

    buildZeroTransform(width: number, height: number, rotation: number, scale: { x: number; y: number }, rotationAnchor: { x: number; y: number }) {
        const Matrix = this.resource.canvasKit.Matrix

        const anchorX = width * (rotationAnchor?.x ?? 0.5)
        const anchorY = height * (rotationAnchor?.y ?? 0.5)

        const R = Matrix.rotated(rotation || 0, anchorX, anchorY)
        const S = Matrix.scaled(scale?.x ?? 1, scale?.y ?? 1, anchorX, anchorY)

        return Matrix.multiply(R, S)
    }

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    protected recomputeLocalMatrix(): void {
        if (!this.shape) {
            return
        }

        const Matrix = this.resource.canvasKit.Matrix

        const { x, y } = this.shape.getCoord()

        const { width, height } = this.shape.getDim()
        const rotation = this.shape.getRotationAngle()
        const { x: sx, y: sy } = this.shape.getScale()
        const anchor = this.shape.getRotationAnchorPoint()
        const offsetX = anchor.x * width
        const offsetY = anchor.y * height

        const T = Matrix.translated(x, y)
        const R = Matrix.rotated(rotation || 0, offsetX, offsetY)
        const S = Matrix.scaled(sx, sy, offsetX, offsetY)

        this.localMatrix = Matrix.multiply(T, R, S)
    }

    isCollide(x: number, y: number): boolean {
        const { x: tx, y: ty } = this.worldToLocal(x, y)

        return this.shape.pointInShape(tx, ty)
    }

    getAbsoluteBoundingRect(): BoundingRect {
        if (!this.shape) {
            return null
        }

        const { width, height } = this.shape.getDim()

        const corners = [
            [0, 0],
            [width, 0],
            [0, height],
            [width, height],
        ]

        const transformedCorners = corners.map(pt => this.localToWorld(pt[0], pt[1]))

        const xs = transformedCorners.map(p => p.x)
        const ys = transformedCorners.map(p => p.y)

        const left = Math.min(...xs)
        const right = Math.max(...xs)
        const top = Math.min(...ys)
        const bottom = Math.max(...ys)

        return { left, top, right, bottom }
    }

    getAbsoluteCoord() {
        return this.localToWorld(0, 0)
    }

    getParent(): SceneNode | null {
        return this.parent
    }

    getLocalMatrix(): number[] | null {
        return this.localMatrix
    }

    getWorldMatrix(): number[] | null {
        return this.worldMatrix
    }

    getDim(): { width: number; height: number } | null {
        return this.shape ? this.shape.getDim() : null
    }

    getProperties(): Properties | null {
        return this.shape ? this.shape.getProperties() : null
    }

    getCoord(): Coord | null {
        return this.shape ? this.shape.getCoord() : null
    }

    getModifierHandlesPos(handle: Handle): { x: number; y: number } | null {
        if (!this.shape) return null

        return this.shape.getModifierHandlesPos(handle)
    }

    getScale(): { x: number; y: number } | null {
        return this.shape ? this.shape.getScale() : null
    }

    getRotationAngle(): number | null {
        return this.shape ? this.shape.getRotationAngle() : null
    }

    getRotationAnchorPoint(): { x: number; y: number } | null {
        return this.shape ? this.shape.getRotationAnchorPoint() : null
    }

    getModifierHandles(): Handle[] | null {
        return this.shape ? this.shape.getModifierHandles() : null
    }

    getLocalBoundingRect(): BoundingRect | null {
        if (!this.shape) return null

        return this.shape.getLocalBoundingRect()
    }

    getCenterCoord(): { x: number; y: number } | null {
        if (!this.shape) return null

        return this.shape.getCenterCoord()
    }

    // ── Delegated shape-specific methods (no instanceof needed) ──────────
    // The Shape base class provides default no-op implementations.
    // Concrete shapes override only the methods they support.

    getArcAngles(): { start: number; sweep: number } | null {
        return this.shape?.getArcAngles() ?? null
    }

    getVertexCount(): number | null {
        return this.shape?.getVertexCount() ?? null
    }

    getShapeType(): string | null {
        if (!this.shape) return null
        return this.shape.getShapeType()
    }

    getVertex(prev: number, vertex: number): { x: number; y: number } | null {
        return this.shape?.getVertex(prev, vertex) ?? null
    }

    isArc(): boolean {
        return this.shape?.isArc() ?? false
    }

    setVertexCount(count: number): void {
        this.shape?.setVertexCount(count)
    }

    setArc(start: number, end: number): void {
        this.shape?.setArc(start, end)
    }

    getArcHandleState(): ArcHandleState | null {
        return this.shape?.getArcHandleState() ?? null
    }

    getSweep(): number | null {
        return this.shape?.getSweep() ?? null
    }

    setArcHandleState(state: Partial<ArcHandleState>, replace = false): void {
        this.shape?.setArcHandleState(state, replace)
    }

    setRatio(ratio: number): void {
        this.shape?.setRatio(ratio)
    }

    setBorderRadius(radius: number, position: HandlePos): void {
        this.shape?.setBorderRadius(radius, position)
    }

    setProperties(properties: Properties): void {
        if (this.shape) {
            this.shape.setProperties(properties)
        }
    }

    hasShape(): boolean {
        return this.shape != null
    }

    setLocalMatrix(matrix: number[]) {
        this.localMatrix = matrix
    }

    setHovered(hovered: boolean): void {
        if (this.shape) {
            this.shape.setHovered(hovered)
        }
    }

    removeChildNode(child: SceneNode): void {
        console.log('implement removeChildNode', child)
    }

    addChildNode(child: SceneNode): void {
        console.log('implement addChildNode', child)
    }

    toDegree(rad: number) {
        return this.shape?.toDegree(rad)
    }

    canEdit(): boolean {
        return this.shape?.canEdit() ?? false
    }

    insertText(char: string, shiftKey: boolean) {
        this.shape?.insertText(char, shiftKey)
    }

    startEditing() {
        this.shape?.startEditing()
    }

    selectAll() {
        this.shape?.selectAll()
    }

    setCursorPosFromCoord(x: number, y: number) {
        this.shape?.setCursorPosFromCoord(x, y)
    }

    deleteText(direc: 'forward' | 'backward') {
        this.shape?.deleteText(direc)
    }

    moveCursor(direc: 'right' | 'left' | 'up' | 'down', shiftKey: boolean) {
        this.shape?.moveCursor(direc, shiftKey)
    }

    cleanUp() {
        this.shape.cleanUp()
    }
    abstract draw(ctx: Canvas): void
    abstract updateWorldMatrix(matrix?: number[]): void
    abstract destroy(): void
}

export default SceneNode

