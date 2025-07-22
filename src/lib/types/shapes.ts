import type Handle from "@lib/modifiers/Handles";
import { Canvas } from "canvaskit-wasm";

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

export type ShapeType = 'rect' | 'oval' | 'star' | 'polygon' | 'text' | 'img';
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'arc-start' | 'arc-end';
export type HandleType = 'size' | 'radius' | 'arc' | 'ratio';

export interface IShape {
    id?: string;
    type?: ShapeType;
    boundingRect: BoundingRect;
    rotation: number;
    scale: number;
    fill: string | number[];
    strokeWidth: number;
    strokeColor: string | number[];

    // Methods that all shapes should implement
    getModifierHandles(size: number, fill: string, strokeColor: string | number[]): any[];
    getSizeModifierHandlesPos(handle: Handle): Coord;
    getModifierHandlesPos(handle: Handle): Coord;

    drawDefault(): void;
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
    updateBorderRadius?(r: number, pos: Corner): void;
    diableEditing?(): void;
    startEditing?(): void;
    setArc?(startAngle: number, endAngle: number): void;
    canEdit?(): boolean;
    moveCursor?(direction: 'left' | 'right' | 'up' | 'down', shiftKey: boolean): void;
    setStrokeColor(stroke: string | number[]): void;
    setFill(stroke: string | number[]): void;
    cleanUp(): void;
}

export interface IShapeModifier {
    setShape(shape: IShape): void;
    getShape(): IShape | null;
    hasShape(): boolean;
    draw(canvas: any): void;
    selectModifier(x: number, y: number): void;
    setIsHovered(bool: boolean): void;
}