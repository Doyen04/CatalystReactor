import { Coord } from '@lib/types/shapes'

function computeArcPoint(
    center: Coord,
    radius: number,
    startAngle: number, // in radians
    sweepAngle: number, // in radians, positive or negative
    t: number // normalized position, 0 => start, 1 => end
): Coord {
    const angle = startAngle + sweepAngle * t
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
    }
}
export default computeArcPoint
