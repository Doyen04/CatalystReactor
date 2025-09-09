import { Coord } from '@lib/types/shapes'
import Vector from './vector'

/**
    FORMULA FOR CALCULATING CORNER RADIUS
    const rMax = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2) BEST FOR IRREGULAR SHAPE
    const rMax = Math.min(len1, len2) * (1 / Math.tan(angle / 2));
    const rMax = Math.min(width, height) / 2 * Math.cos(Math.PI / n);
    const rMax =  (sideLength / 2) * (1 / Math.tan(Math.PI / n)) 
**/
function computeRoundedCorner(shapeType: 'star' | 'polygon', i: number, points: Coord[], sides: number, radius: number) {
    const n = sides

    if (n < 3) throw new Error('Polygon must have at least 3 sides')

    const vertices = points
    const startPoint = vertices[(i - 1 + n) % n]
    const controlPoint = vertices[i]
    const endPoint = vertices[(i + 1) % n]

    // Direction vectors
    const v1 = Vector.subtract(startPoint, controlPoint)
    const v2 = Vector.subtract(endPoint, controlPoint)

    const len1 = Vector.length(v1)
    const len2 = Vector.length(v2)

    // Normalize
    const normStart = Vector.normalize(v1)
    const normEnd = Vector.normalize(v2)

    // Angle between edges
    const dot = Vector.dot(normStart, normEnd)
    const angle = Math.acos(dot)
    let r = 0
    const rInside = Math.min(len1 / 2, len2 / 2) * Math.tan(angle / 2)

    if (shapeType == 'polygon') {
        r = Math.min(rInside, radius)
    } else if (shapeType == 'star') {
        r = i % 2 === 0 ? radius : Math.min(rInside, radius)
        // console.log(i, r, rInside, radius)//fix this for stars
    }

    // Distance to offset along each edge
    const dist = r / Math.tan(angle / 2)

    // Cut points
    const arcStart = Vector.add(controlPoint, Vector.scale(normStart, dist))
    const arcEnd = Vector.add(controlPoint, Vector.scale(normEnd, dist))

    const turnSign = Math.sign(Vector.cross(normStart, normEnd)) || 1 // orientation of the corner
    const startNormal = turnSign > 0 ? Vector.leftNormal(normStart) : Vector.rightNormal(normStart)
    const endNormal = turnSign > 0 ? Vector.rightNormal(normEnd) : Vector.leftNormal(normEnd)

    const centerCandidateFromStart = Vector.add(arcStart, Vector.scale(Vector.normalize(startNormal), r))
    const centerCandidateFromEnd = Vector.add(arcEnd, Vector.scale(Vector.normalize(endNormal), r))
    const arcCenter = {
        x: (centerCandidateFromStart.x + centerCandidateFromEnd.x) * 0.5,
        y: (centerCandidateFromStart.y + centerCandidateFromEnd.y) * 0.5,
    }

    return {
        startPoint: arcStart,
        endPoint: arcEnd,
        controlPoint: controlPoint,
        currentRadius: r,
        arcCenter: arcCenter,
        turnSign: turnSign,
    }
}
export default computeRoundedCorner
