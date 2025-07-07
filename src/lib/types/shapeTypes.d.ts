type ShapeType = "rectangle" | "oval" | "polygon" | "star";

interface ShapeOptions {
    x: number;
    y: number;
}

type HandleType = "radius" | "size" | "rotate";

type Points = [
    x: number,
    y: number
]

declare enum ToolType{
    Select = 'select',
    Oval = 'oval',
    Rect = 'rect',
}

interface Coords{
    x:number;
    y:number;
}