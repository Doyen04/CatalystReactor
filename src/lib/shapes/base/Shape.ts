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

    drawModifierHandles(canvas: Canvas, resource: CanvasKitResources): void {
        const { width, height } = this.getDim()
        const cw = resource.canvasKit
        const pad = 2

        const paint = new cw.Paint()
        paint.setColor(cw.Color(255, 255, 255, 1))
        paint.setStyle(cw.PaintStyle.Fill)
        
        const stroke = new cw.Paint()
        stroke.setColor(cw.Color(0, 0, 255, 1))
        stroke.setStyle(cw.PaintStyle.Stroke)
        stroke.setStrokeWidth(1.5)

        const drawHandle = (x: number, y: number, s: number = 8) => {
            const rect = cw.XYWHRect(x - s/2, y - s/2, s, s)
            canvas.drawRect(rect, paint)
            canvas.drawRect(rect, stroke)
        }

        // Draw Bounding Box Outline
        const bbox = cw.XYWHRect(0, 0, width, height)
        canvas.drawRect(bbox, stroke)

        // Draw Size Handles
        drawHandle(0, 0) // top-left
        drawHandle(width, 0) // top-right
        drawHandle(0, height) // bottom-left
        drawHandle(width, height) // bottom-right

        // Draw Rotation Handle
        drawHandle(width / 2, -25)
        
        // Draw Rotation Line
        const linePath = new cw.Path()
        linePath.moveTo(width / 2, 0)
        linePath.lineTo(width / 2, -21)
        canvas.drawPath(linePath, stroke)
        
        paint.delete(); stroke.delete(); linePath.delete()
    }
    
    hitTestModifierHandle(x: number, y: number): string | null { 
        const { width, height } = this.getDim()
        const s = 10 // hit pad

        // Check Rotation
        const cx = width / 2
        const cy = -25
        if (Math.abs(x - cx) <= s && Math.abs(y - cy) <= s) return 'angle'

        // Check Size
        if (Math.abs(x - 0) <= s && Math.abs(y - 0) <= s) return 'size-top-left'
        if (Math.abs(x - width) <= s && Math.abs(y - 0) <= s) return 'size-top-right'
        if (Math.abs(x - 0) <= s && Math.abs(y - height) <= s) return 'size-bottom-left'
        if (Math.abs(x - width) <= s && Math.abs(y - height) <= s) return 'size-bottom-right'

        return null 
    }
    
    dragModifierHandle(
        _handleID: string, 
        _localCurrent: Coord, 
        _localStart: Coord, 
        _initialShapeData: any,
        _sceneUpdate?: any
    ): void { /* no-op by default for base */ }

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
