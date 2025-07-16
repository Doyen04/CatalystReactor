import { Canvas } from "canvaskit-wasm";

export interface BoundingRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface Point {
    x: number;
    y: number;
}

export type ShapeType = 'rect' | 'oval' | 'star' | 'polygon' | 'text';
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type HandleType = 'size' | 'radius' | 'corner';

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
    getSizeModifierHandlesPos(pos: Corner, size: number, type: HandleType, isDragging: boolean): Point;
    getModifierHandlesPos(pos: Corner, size: number, type: HandleType, isDragging: boolean): Point;
    pointInShape(x: number, y: number): boolean;
    moveShape(mx: number, my: number): void;
    calculateBoundingRect(): void;
    setSize(dragStart: { x: number, y: number }, mx: number, my: number, shiftKey: boolean): void;
    draw(canvas: Canvas): void;
    setDim(width: number, height: number): void;
    setCoord(x: number, y: number): void;
    setHovered?(B: boolean): void;
    setRadius?(r: number): void;
    destroy?(): void;
    updateBorderRadius?(r: number, pos: Corner): void;
    getCoord?(): { x: number, y: number };
    updateDim?(dx:number, dy:number):void;
    setStrokeColor(stroke: string | number[]): void;
    setFill(stroke: string | number[]): void;
}

export interface IShapeModifier {
    setShape(shape: IShape): void;
    getShape(): IShape | null;
    hasShape(): boolean;
    draw(canvas: any): void;
    selectModifier(x: number, y: number): void;
    setIsHovered(bool: boolean): void;
}