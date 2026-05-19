import Handle from '@lib/modifiers/Handles'
import { CanvasKitResources } from '@lib/core/CanvasKitResource'
import {
    ArcHandleState,
    BoundingRect,
    Coord,
    CornerPos,
    HandlePos,
    Properties,
    ShapeType,
} from '@lib/types/shapes'
import type { Canvas } from 'canvaskit-wasm'
import PaintManager from '@lib/core/PaintManager'
import container from '@lib/core/DependencyManager'
import { ShapeData } from '@lib/core/EngineStateStore'

abstract class Shape {
    protected aspectRatio: number = 1
    protected maintainAspectRatio: boolean = false
    protected isHover: boolean = false
    protected rotationAnchorPosition: Coord = { x: 0.5, y: 0.5 }
    protected paintManager: PaintManager
    public data: ShapeData

    constructor(data: ShapeData) {
        if (new.target === Shape) throw new Error('Shape is abstract; extend it!')
        this.data = data
        this.paintManager = container.resolve("paintManager");
    }

    abstract getCenterCoord(): Coord
    abstract getModifierHandles(): Handle[]
    abstract getModifierHandlesPos(handle: Handle): { x: number; y: number }
    abstract pointInShape(x: number, y: number): boolean
    abstract draw(canvas: Canvas): void
    abstract setDim(width: number, height: number): void
    abstract getDim(): { width: number; height: number }
    abstract cleanUp(): void

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance()
        if (resources) {
            return resources
        } else {
            console.log('resources is null')
            return null
        }
    }

    moveShape(mx: number, my: number): void {
        this.data.properties.transform.x += mx
        this.data.properties.transform.y += my
    }

    setCoord(x: number, y: number): void {
        this.data.properties.transform.x = x
        this.data.properties.transform.y = y
    }

    setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        const willFlipX = deltaX < 0
        const willFlipY = deltaY < 0

        this.data.properties.transform.scaleX = willFlipX ? -1 : 1
        this.data.properties.transform.scaleY = willFlipY ? -1 : 1

        if (shiftKey || this.maintainAspectRatio) {
            let newWidth: number
            let newHeight: number

            if (this.maintainAspectRatio && !shiftKey) {
                const absX = Math.abs(deltaX)
                const absY = Math.abs(deltaY)

                if (absX / this.aspectRatio >= absY) {
                    newWidth = Math.round(absX)
                    newHeight = Math.round(absX / this.aspectRatio)
                } else {
                    newHeight = Math.round(absY)
                    newWidth = Math.round(absY * this.aspectRatio)
                }
            } else {
                const size = Math.max(Math.abs(deltaX), Math.abs(deltaY))
                newWidth = Math.round(size)
                newHeight = Math.round(size)
            }

            this.setDim(newWidth, newHeight)

            this.data.properties.transform.x = willFlipX ? dragStart.x - newWidth : dragStart.x
            this.data.properties.transform.y = willFlipY ? dragStart.y - newHeight : dragStart.y
        } else {
            this.setDim(Math.abs(deltaX), Math.abs(deltaY))
            this.data.properties.transform.x = Math.min(dragStart.x, mx)
            this.data.properties.transform.y = Math.min(dragStart.y, my)
        }
    }

    getShapeType(): ShapeType {
        return this.data.type
    }

    getLocalBoundingRect(): BoundingRect {
        const { width, height } = this.getDim()
        return {
            left: 0,
            top: 0,
            right: width,
            bottom: height
        }
    }

    getRotationAnchorPoint() {
        return this.rotationAnchorPosition
    }

    getAngleModifierHandles(): Handle[] {
        const handles: Handle[] = []
        CornerPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'angle'))
        })
        return handles
    }

    getAngleModifierHandlesPos(handle: Handle): Coord {
        const dimen = this.getDim()
        const bRect = {
            left: 0,
            top: 0,
            right: dimen.width,
            bottom: dimen.height,
        }
        const size = handle.size / 2
        const padding = handle.size

        switch (handle.pos) {
            case 'top-left':
                return { x: bRect.left - size - padding, y: bRect.top - size - padding }
            case 'top-right':
                return { x: bRect.right - size + padding, y: bRect.top - size - padding }
            case 'bottom-left':
                return { x: bRect.left - size - padding, y: bRect.bottom - size + padding }
            case 'bottom-right':
                return { x: bRect.right - size + padding, y: bRect.bottom - size + padding }
            default:
                return { x: 0, y: 0 }
        }
    }

    getSizeModifierHandles(): Handle[] {
        const handles: Handle[] = []
        CornerPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'size'))
        })
        return handles
    }

    getSizeModifierHandlesPos(handle: Handle): Coord {
        const dimen = this.getDim()
        const bRect = {
            left: 0,
            top: 0,
            right: dimen.width,
            bottom: dimen.height,
        }
        const size = handle.size / 2

        switch (handle.pos) {
            case 'top-left':
                return { x: bRect.left - size, y: bRect.top - size }
            case 'top-right':
                return { x: bRect.right - size, y: bRect.top - size }
            case 'bottom-left':
                return { x: bRect.left - size, y: bRect.bottom - size }
            case 'bottom-right':
                return { x: bRect.right - size, y: bRect.bottom - size }
            default:
                return { x: 0, y: 0 }
        }
    }

    getCoord(): Coord {
        return { x: this.data.properties.transform.x, y: this.data.properties.transform.y }
    }

    drawDefault() {
        const defSize = 100
        this.setDim(defSize, defSize)
        this.setCoord(this.data.properties.transform.x - defSize / 2, this.data.properties.transform.y - defSize / 2)
    }

    getRotationAngle(): number {
        return this.data.properties.transform.rotation || 0
    }

    getScale(): { x: number; y: number } {
        return {
            x: this.data.properties.transform.scaleX || 1,
            y: this.data.properties.transform.scaleY || 1,
        }
    }

    setAngle(angle: number): void {
        this.data.properties.transform.rotation = angle
    }

    setAnchorPoint(anchor: Coord): void {
        console.log('not yet implemented', anchor)
    }

    setScale(x: number, y: number): void {
        this.data.properties.transform.scaleX = x
        this.data.properties.transform.scaleY = y
    }

    getProperties(): Properties {
        return this.data.properties
    }

    setProperties(prop: Properties): void {
        this.data.properties = prop
    }

    setHovered(bool: boolean) {
        this.isHover = bool
    }

    // ── DELEGATION MODIFIER METHODS ───────────────
    // These methods replace the legacy Handles array system and allow 
    // shapes to natively calculate hit tests and draw their own smart UI overlays.

    drawModifierHandles(_canvas: any): void { /* no-op by default */ }
    
    hitTestModifierHandle(_x: number, _y: number): string | null { 
        return null 
    }
    
    dragModifierHandle(
        _handleID: string, 
        _localCurrent: Coord, 
        _localStart: Coord, 
        _initialShapeData: any
    ): void { /* no-op by default */ }

    // ── FLATTEN METHOD ───────────────
    // Converts mathematically parameterized primitive data into explicit points
    convertToPathData(): any | null {
        return null
    }

    // ── Virtual methods with default no-op implementations ───────────────
    
    getArcAngles(): { start: number; sweep: number } | null { return null }
    isArc(): boolean { return false }
    setArc(_start: number, _end: number): void { /* no-op */ }
    getArcHandleState(): ArcHandleState | null { return null }
    getSweep(): number | null { return null }
    setArcHandleState(_state: Partial<ArcHandleState>, _replace?: boolean): void { /* no-op */ }
    toDegree(_rad: number): number | undefined { return undefined }

    getVertexCount(): number | null { return null }
    setVertexCount(_count: number): void { /* no-op */ }
    getVertex(_prev: number, _vertex: number): { x: number; y: number } | null { return null }

    setRatio(_ratio: number): void { /* no-op */ }

    setBorderRadius(_radius: number, _position: HandlePos): void { /* no-op */ }

    canEdit(): boolean { return false }
    insertText(_char: string, _shiftKey: boolean): void { /* no-op */ }
    startEditing(): void { /* no-op */ }
    selectAll(): void { /* no-op */ }
    setCursorPosFromCoord(_x: number, _y: number): void { /* no-op */ }
    deleteText(_direc: 'forward' | 'backward'): void { /* no-op */ }
    moveCursor(_direc: 'right' | 'left' | 'up' | 'down', _shiftKey: boolean): void { /* no-op */ }
    protected drawHoverEffect(_canvas: Canvas, _rect?: any): void { /* no-op */ }
    setFontSize(_size: number): void { /* no-op */ }
    setFontFamily(_fontFamily: string): void { /* no-op */ }
    getMaxRadius(): number { return Infinity }

    abstract destroy(): void
}
export default Shape
