import type Handle from "@lib/modifiers/Handles";
import type { Canvas } from "canvaskit-wasm";

export interface Transform {
    x: number;
    y: number;
    rotation?: number;
    scale?: number;
    anchorPoint?: number;
    isFlippedX?: boolean;
    isFlippedY?: boolean;
    originalX?: number;
    originalY?: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Style {
    fill: string;
    strokeWidth: number;
    strokeColor: string;
}

export interface BorderRadius {
    'top-left': number,
    'top-right': number,
    'bottom-left': number,
    'bottom-right': number,
    'locked': boolean
}
export interface ArcSegment {
    startAngle: number;
    endAngle: number;
    ratio: number
}

export interface Sides {
    sides: number;
}

export interface SpikesRatio{
    spikes:number;
    ratio:number;
}

export interface Properties {
    transform: Transform;
    size: Size;
    style: Style
    borderRadius?: BorderRadius
    arcSegment?: ArcSegment;
    sides?: Sides;
    spikesRatio?: SpikesRatio;
}

export interface BoundingRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface Coord {
    x: number;
    y: number;
}

export const SizeRadiusModifierPos: HandlePos[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
];

export type ShapeType = 'rect' | 'oval' | 'star' | 'polygon' | 'text' | 'img';
export type HandlePos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'arc-start' | 'arc-end' | 'top' | 'right';
export type HandleType = 'size' | 'radius' | 'arc' | 'ratio' | 'vertices';

export interface IShape {
    id?: string;
    type?: ShapeType;
    boundingRect: BoundingRect;

    // Methods that all shapes should implement
    getModifierHandles(size: number, fill: string, strokeColor: string | number[]): Handle[];
    getSizeModifierHandlesPos(handle: Handle): Coord;
    getModifierHandlesPos(handle: Handle): Coord;

    drawDefault(): void;
    getProperties(): Properties;
    setProperties(prop: Properties): void;
    pointInShape(x: number, y: number): boolean;
    moveShape(mx: number, my: number): void;
    calculateBoundingRect(): void;
    setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    draw(canvas: Canvas): void;
    setDim(width: number, height: number): void;
    getDim(): { width: number, height: number };
    getCoord?(): { x: number, y: number };
    setCoord(x: number, y: number): void;
    setHovered?(B: boolean): void;
    setRadius?(r: number): void;
    destroy?(): void;
    isArc?(): boolean;
    getArcAngles?(): { start: number, end: number }
    setRatio?(r: number): void;
    getCenterCoord?(): { x: number, y: number };
    updateBorderRadius?(r: number, pos: HandlePos): void;
    diableEditing?(): void;
    startEditing?(): void;
    setArc?(startAngle: number, endAngle: number): void;
    canEdit?(): boolean;
    selectAll?(): void;
    insertText?(char: string, shiftKey: boolean): void;
    setCursorPosFromCoord?(x: number, y: number): void;
    deleteText?(direction: 'forward' | 'backward'): void;
    moveCursor?(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean): void;
    setStrokeColor(stroke: string | number[]): void;
    setFill(stroke: string | number[]): void;
    cleanUp(): void;
}

export interface IShapeModifier {
    setShape(shape: IShape): void;
    getShape(): IShape | null;
    hasShape(): boolean;
    draw(canvas: Canvas): void;
    selectModifier(x: number, y: number): void;
    setIsHovered(bool: boolean): void;
}