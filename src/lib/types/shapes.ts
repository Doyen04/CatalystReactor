import type Handle from '@lib/modifiers/Handles'
import type { Canvas, Image as CanvasKitImage } from 'canvaskit-wasm'
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, Circle } from 'lucide-react'

export const PRESET_LINEAR_GRADIENTS = [
    {
        name: 'Sunset',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#ff7e5f' },
            { offset: 1, color: '#feb47b' },
        ],
    },
    {
        name: 'Ocean',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
        ],
    },
    {
        name: 'Forest',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#11998e' },
            { offset: 1, color: '#38ef7d' },
        ],
    },
    {
        name: 'Fire',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#ff9a9e' },
            { offset: 1, color: '#fecfef' },
        ],
    },
    {
        name: 'Sky',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#a8edea' },
            { offset: 1, color: '#fed6e3' },
        ],
    },
    {
        name: 'Purple',
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        stops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
        ],
    },
]

export const LINEAR_PRESET_DIRECTIONS = [
    { name: 'Diagonal ↖', x1: 100, y1: 100, x2: 0, y2: 0, icon: ArrowUpLeft },
    { name: 'Bottom to Top', x1: 0, y1: 100, x2: 0, y2: 0, icon: ArrowUp },
    { name: 'Diagonal ↗', x1: 0, y1: 100, x2: 100, y2: 0, icon: ArrowUpRight },
    { name: 'Right to Left', x1: 100, y1: 0, x2: 0, y2: 0, icon: ArrowLeft },
    null,
    { name: 'Left to Right', x1: 0, y1: 0, x2: 100, y2: 0, icon: ArrowRight },
    {
        name: 'Diagonal ↙',
        x1: 100,
        y1: 0,
        x2: 0,
        y2: 100,
        icon: ArrowDownLeft,
    },
    { name: 'Top to Bottom', x1: 0, y1: 0, x2: 0, y2: 100, icon: ArrowDown },
    {
        name: 'Diagonal ↘',
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        icon: ArrowDownRight,
    },
]

export const PRESET_RADIAL_GRADIENTS = [
    {
        name: 'Sunset',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#ff7e5f' },
            { offset: 1, color: '#feb47b' },
        ],
    },
    {
        name: 'Ocean',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
        ],
    },
    {
        name: 'Forest',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#11998e' },
            { offset: 1, color: '#38ef7d' },
        ],
    },
    {
        name: 'Fire',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#ff9a9e' },
            { offset: 1, color: '#fecfef' },
        ],
    },
    {
        name: 'Sky',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#a8edea' },
            { offset: 1, color: '#fed6e3' },
        ],
    },
    {
        name: 'Purple',
        type: 'radial',
        cx: 50,
        cy: 50,
        radius: 70,
        stops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
        ],
    },
]

export const RADIAL_PRESET_DIRECTIONS = [
    { name: 'Top Left', cx: 0, cy: 0, icon: ArrowUpLeft },
    { name: 'Top', cx: 50, cy: 0, icon: ArrowUp },
    { name: 'Top Right', cx: 100, cy: 0, icon: ArrowUpRight },
    { name: 'Left', cx: 0, cy: 50, icon: ArrowLeft },
    { name: 'Center', cx: 50, cy: 50, icon: Circle },
    { name: 'Right', cx: 100, cy: 50, icon: ArrowRight },
    { name: 'Bottom Left', cx: 0, cy: 100, icon: ArrowDownLeft },
    { name: 'Bottom', cx: 50, cy: 100, icon: ArrowDown },
    { name: 'Bottom Right', cx: 100, cy: 100, icon: ArrowDownRight },
]

export const DEFAULT_LINEAR_GRADIENT: LinearGradient = {
    type: 'linear',
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 0,
    stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' },
    ],
}

export const DEFAULT_RADIAL_GRADIENT: RadialGradient = {
    type: 'radial',
    cx: 50,
    cy: 50,
    radius: 70,
    stops: [
        { offset: 0, color: '#ffffff' },
        { offset: 1, color: '#000000' },
    ],
}

export interface Transform {
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
    anchorPoint: Coord | null
    isFlippedX?: boolean
    isFlippedY?: boolean
    originalX?: number
    originalY?: number
}

export interface Size {
    width: number
    height: number
}

export type FillType = 'solid' | 'gradient' | 'image' | 'pattern'
export type ScaleMode = 'fill' | 'fit' | 'tile' | 'stretch'
export type Gradient = 'linear' | 'radial'
export type GradientFill = LinearGradient | RadialGradient

export interface GradientStop {
    offset: number
    color: string
}

export interface LinearGradient {
    type: 'linear'
    x1: number
    y1: number
    x2: number
    y2: number
    stops: GradientStop[]
}

export interface RadialGradient {
    type: 'radial'
    cx: number
    cy: number
    radius: number
    stops: GradientStop[]
}

export interface ImageFill {
    type: 'image'
    imageData: ArrayBuffer
    cnvsImage?: CanvasKitImage
    scaleMode: ScaleMode
}

export interface PatternFill {
    type: 'pattern'
    imageData: ArrayBuffer
    cnvsImage?: CanvasKitImage
    repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
}

export interface SolidFill {
    type: 'solid'
    color: string | number[]
}

export interface Stroke {
    fill: Fill
    width: number
    lineCap?: 'butt' | 'round' | 'square'
    lineJoin?: 'miter' | 'round' | 'bevel'
    dashArray?: number[]
}

export type FillStyle = SolidFill | GradientFill | ImageFill | PatternFill

export interface Fill {
    color: FillStyle
    opacity: number
}

export interface Style {
    fill: Fill
    stroke: Stroke
}

export interface BorderRadius {
    'top-left': number
    'top-right': number
    'bottom-left': number
    'bottom-right': number
    locked: boolean
}
export interface ArcSegment {
    startAngle: number
    endAngle: number
    ratio: number
}

export interface Sides {
    sides: number
}

export interface SpikesRatio {
    spikes: number
    ratio: number
}

export interface Properties {
    transform: Transform
    size: Size
    style: Style
    borderRadius?: BorderRadius
    arcSegment?: ArcSegment
    sides?: Sides
    spikesRatio?: SpikesRatio
}

export interface BoundingRect {
    left: number
    top: number
    right: number
    bottom: number
}

export interface Coord {
    x: number
    y: number
}
export const CornerPos: HandlePos[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export type ShapeType = 'rect' | 'oval' | 'star' | 'polygon' | 'text' | 'img'
export type HandlePos =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center'
    | 'arc-start'
    | 'arc-end'
    | 'top'
    | 'right'
    | 'between'
    | 'bottom'
    | 'left'
export type HandleType = 'size' | 'angle' | 'radius' | 'arc' | 'c-ratio' | 'vertices' | 's-ratio'

export interface IShape {
    id?: string
    type?: ShapeType

    getShapeType(): ShapeType
    getBoundingRect(): BoundingRect
    getRotationAnchorPoint(): Coord
    createCanvasKitImage(image: ArrayBuffer | null): void
    handleFlip(isFlippedX: boolean, isFlippedY: boolean): void
    // Methods that all shapes should implement
    getModifierHandles(): Handle[]
    getSizeModifierHandlesPos(handle: Handle): Coord
    getModifierHandlesPos(handle: Handle): Coord

    drawDefault(): void
    getProperties(): Properties
    setProperties(prop: Properties): void
    pointInShape(x: number, y: number): boolean
    moveShape(mx: number, my: number): void
    calculateBoundingRect(): void
    setSize(dragStart: { x: number; y: number }, mx: number, my: number, shiftKey: boolean): void
    draw(canvas: Canvas): void
    setDim(width: number, height: number): void
    getDim(): { width: number; height: number }
    getCoord(): { x: number; y: number }
    setAngle(angle: number): void
    setCoord(x: number, y: number): void
    setAnchorPoint(anchor: Coord): void
    setHovered?(B: boolean): void
    setRadius?(r: number): void
    destroy?(): void
    isArc?(): boolean
    getArcAngles?(): { start: number; end: number }
    setRatio?(r: number): void
    getCenterCoord?(): { x: number; y: number }
    setBorderRadius?(r: number, pos: HandlePos): void
    diableEditing?(): void
    startEditing?(): void
    setArc?(startAngle: number, endAngle: number): void
    canEdit?(): boolean
    selectAll?(): void
    insertText?(char: string, shiftKey: boolean): void
    setCursorPosFromCoord?(x: number, y: number): void
    deleteText?(direction: 'forward' | 'backward'): void
    moveCursor?(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean): void
    setVertexCount?(num: number): void
    getVertexCount?(): number
    getVertex?(sides: number, index: number, startAngle?: number): { x: number; y: number }
    setStrokeColor(stroke: string | number[]): void
    setFill(stroke: string | number[]): void
    cleanUp(): void
}

export interface IShapeModifier {
    setShape(shape: IShape): void
    getShape(): IShape | null
    hasShape(): boolean
    draw(canvas: Canvas): void
    selectModifier(x: number, y: number): void
    setIsHovered(bool: boolean): void
}
