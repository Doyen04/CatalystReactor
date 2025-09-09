import { Coord } from '@lib/types/shapes'

const Vector = {
    subtract: (a: Coord, b: Coord) => ({ x: a.x - b.x, y: a.y - b.y }),
    add: (a: Coord, b: Coord) => ({ x: a.x + b.x, y: a.y + b.y }),
    scale: (a: Coord, scalar: number) => ({ x: a.x * scalar, y: a.y * scalar }),
    length: (a: Coord) => Math.hypot(a.x, a.y),
    normalize: (a: Coord) => {
        const length = Math.hypot(a.x, a.y) || 1
        return { x: a.x / length, y: a.y / length }
    },
    dot: (a: Coord, b: Coord) => a.x * b.x + a.y * b.y,
    cross: (a: Coord, b: Coord) => a.x * b.y - a.y * b.x,
    leftNormal: (a: Coord) => ({ x: -a.y, y: a.x }),
    rightNormal: (a: Coord) => ({ x: a.y, y: -a.x }),
}

export default Vector
