import type { Image as CanvasKitImage, TextFontVariations } from 'canvaskit-wasm'
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
    imageData?: ArrayBuffer
    cnvsImage?: CanvasKitImage
    scaleMode: ScaleMode
}

export interface PatternFill {
    type: 'pattern'
    imageData?: ArrayBuffer
    cnvsImage?: CanvasKitImage
    repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
}

export interface SolidFill {
    type: 'solid'
    color: string | number[]
}

export type PaintStyle = SolidFill | GradientFill | ImageFill | PatternFill

export interface ColorProps  {
    color: PaintStyle
    opacity: number
}

export interface Stroke extends ColorProps {
    width: number
    lineCap?: 'butt' | 'round' | 'square'
    lineJoin?: 'miter' | 'round' | 'bevel'
    dashArray?: number[]
}
export type Fill = ColorProps

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
    sweep: number
    ratio: number
}

export interface Sides {
    sides: number
}

export interface SpikesRatio {
    spikes: number
    ratio: number
}

export interface PTextStyle {
    textFill: Fill;
    textStroke?: Stroke;
    fontSize: number
    fontWeight: number
    fontFamilies: string[]
    lineHeight: number
    textAlign: 'left' | 'right' | 'center' | 'justify'
    textSpacing?: number
    backgroundColor?: Fill
    backgroundStroke?: Stroke
    fontVariations?: TextFontVariations[]
}

export interface Properties {
    transform: Transform
    size: Size
    style: Style
    borderRadius?: BorderRadius
    arcSegment?: ArcSegment
    sides?: Sides
    spikesRatio?: SpikesRatio
    textStyle?: PTextStyle
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

export type ShapeType = 'rect' | 'oval' | 'star' | 'polygon' | 'text' | 'img' | 'plainRect'
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

export type ArcHandleState = {
    dragDirection?: number
    dragLastDiff?: number
    dragPrevPointer?: number
}

export type HandleType = 'size' | 'angle' | 'radius' | 'arc' | 'c-ratio' | 'vertices' | 's-ratio'
