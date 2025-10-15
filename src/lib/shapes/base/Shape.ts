// ════════════════════════════════════
// 📐 Abstract Base Shape Class

import Handle from '@lib/modifiers/Handles'
import { CanvasKitResources } from '@lib/core/CanvasKitResource'
import {
    BoundingRect,
    Coord,
    CornerPos,
    Properties,
    ShapeType,
    SolidFill,
    Style,
    Transform,
} from '@lib/types/shapes'
import type { Canvas } from 'canvaskit-wasm'
import PaintManager from '@lib/core/PaintManager'
import container from '@lib/core/DependencyManager'

interface Arguments {
    x: number
    y: number
    type: ShapeType
    rotation?: number
    scale?: number
    _fill?: string
    strokeWidth?: number
    strokeColor?: string
}

abstract class Shape {
    protected aspectRatio: number = 1
    protected maintainAspectRatio: boolean = false
    protected shapeType: ShapeType
    protected transform: Transform
    protected style: Style
    protected boundingRect: BoundingRect
    protected isHover: boolean
    protected rotationAnchorPosition: Coord
    protected paintManager: PaintManager

    constructor({ x, y, type, rotation = 0, scale = 1, _fill = '#fff', strokeWidth = 1, strokeColor = '#000' }: Arguments) {
        if (new.target === Shape) throw new Error('Shape is abstract; extend it!')
        this.transform = {
            x,
            y,
            rotation,
            scaleX: scale,
            scaleY: scale,
            anchorPoint: { x: 0, y: 0 },
        }
        this.rotationAnchorPosition = { x: 0.5, y: 0.5 }

        const fill: SolidFill = { type: 'solid', color: _fill }
        const stroke: SolidFill = { type: 'solid', color: strokeColor }
        this.style = {
            fill: { color: fill, opacity: 1 },
            stroke: { color: stroke, opacity: 1, width: strokeWidth },
        }
        this.boundingRect = { top: 0, left: 0, bottom: 0, right: 0 }
        this.isHover = false
        this.shapeType = type
        this.paintManager = container.resolve<PaintManager>("paintManager");
    }

    abstract getCenterCoord(): Coord
    abstract getModifierHandles(): Handle[]
    abstract getModifierHandlesPos(handle: Handle): { x: number; y: number }
    abstract pointInShape(x: number, y: number): boolean
    abstract moveShape(mx: number, my: number): void
    abstract calculateBoundingRect(): void
    abstract draw(canvas: Canvas): void
    abstract setDim(width: number, height: number): void
    abstract getDim(): { width: number; height: number }
    abstract setCoord(x: number, y: number): void
    abstract getProperties(): Properties
    abstract setProperties(prop: Properties): void
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

    setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void {
        const deltaX = mx - dragStart.x
        const deltaY = my - dragStart.y

        const willFlipX = deltaX < 0
        const willFlipY = deltaY < 0

        this.transform.scaleX = willFlipX ? -1 : 1
        this.transform.scaleY = willFlipY ? -1 : 1

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

            // ADD: Position update for proper flipping
            this.transform.x = willFlipX ? dragStart.x - newWidth : dragStart.x
            this.transform.y = willFlipY ? dragStart.y - newHeight : dragStart.y
        } else {
            this.setDim(Math.abs(deltaX), Math.abs(deltaY))
            this.transform.x = Math.min(dragStart.x, mx)
            this.transform.y = Math.min(dragStart.y, my)
        }

        this.calculateBoundingRect()
    }

    getShapeType(): ShapeType {
        return this.shapeType
    }

    getLocalBoundingRect(): BoundingRect {
        return structuredClone(this.boundingRect)
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

    //local coord
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
                return {
                    x: bRect.left - size - padding,
                    y: bRect.top - size - padding,
                }
            case 'top-right':
                return {
                    x: bRect.right - size + padding,
                    y: bRect.top - size - padding,
                }
            case 'bottom-left':
                return {
                    x: bRect.left - size - padding,
                    y: bRect.bottom - size + padding,
                }
            case 'bottom-right':
                return {
                    x: bRect.right - size + padding,
                    y: bRect.bottom - size + padding,
                }
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

    //local coord
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
        return { x: this.transform.x, y: this.transform.y }
    }

    drawDefault() {
        const defSize = 100
        this.setDim(defSize, defSize)
        this.setCoord(this.transform.x - defSize / 2, this.transform.y - defSize / 2)
    }

    getRotationAngle(): number {
        return this.transform.rotation || 0
    }

    getScale(): { x: number; y: number } {
        return {
            x: this.transform.scaleX || 1,
            y: this.transform.scaleY || 1,
        }
    }

    setAngle(angle: number): void {
        this.transform.rotation = angle
        // this.style.strokeColor = color;
    }

    setAnchorPoint(anchor: Coord): void {
        console.log('not yet implemented', anchor)
        // this.transform.anchorPoint = anchor
    }

    setStrokeColor(stroke: string | number[]): void {
        console.log(stroke)
    }

    setScale(x: number, y: number): void {
        this.transform.scaleX = x
        this.transform.scaleY = y
    }

    setStrokeWidth(width: number): void {
        console.log(width)

        // this.style.strokeWidth = width;
    }

    setFill(color: string): void {
        console.log(color)

        //     this.style.fill = color;
    }

    setHovered(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHover = bool
    }

    //better management for canvaskit resources

    abstract destroy(): void
}
export default Shape
