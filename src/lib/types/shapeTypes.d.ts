declare type ToolType = 'select' | 'oval' | 'rect' | 'star' | 'text' | 'polygon'

declare type ShapeType = "rect" | "oval" | "polygon" | "star" | "text";

interface ShapeOptions {
    x: number;
    y: number;
}

declare type HandleType = "radius" | "size" | "rotate";

declare type Points = [
    x: number,
    y: number
]


declare interface Coords {
    x: number;
    y: number;
}
