import { describe, expect, it } from 'vitest'
import computeRoundedCorner from '../helper/roundingUtil'

const squarePoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
]

describe('computeRoundedCorner polygon', () => {
    it('computes the radius-20 corner at control point (100,0) of a regular square', () => {
        const result = computeRoundedCorner('polygon', 1, squarePoints, 4, 20)

        // control point (100,0), neighbours (0,0) and (100,100)
        const control = squarePoints[1]

        expect(result.currentRadius).toBeCloseTo(20, 5)

        expect(result.arcCenter.x).toBeCloseTo(80, 5)
        expect(result.arcCenter.y).toBeCloseTo(20, 5)

        // arcStart on edge control->start ((100,0)->(0,0)): (80,0)
        expect(result.startPoint.x).toBeCloseTo(80, 5)
        expect(result.startPoint.y).toBeCloseTo(0, 5)

        // arcEnd on edge control->end ((100,0)->(100,100)): (100,20)
        expect(result.endPoint.x).toBeCloseTo(100, 5)
        expect(result.endPoint.y).toBeCloseTo(20, 5)

        // arcCenter is equidistant (≈ currentRadius) from both tangent points
        const startToCenter = Math.hypot(result.arcCenter.x - result.startPoint.x, result.arcCenter.y - result.startPoint.y)
        const endToCenter = Math.hypot(result.arcCenter.x - result.endPoint.x, result.arcCenter.y - result.endPoint.y)
        expect(startToCenter).toBeCloseTo(result.currentRadius, 5)
        expect(endToCenter).toBeCloseTo(result.currentRadius, 5)

        expect(result.controlPoint).toEqual(control)
    })
})

describe('computeRoundedCorner polygon clamping', () => {
    it('clamps currentRadius to rInside when radius is large (100 on a square -> 50)', () => {
        const result = computeRoundedCorner('polygon', 1, squarePoints, 4, 100)

        expect(result.currentRadius).toBeLessThanOrEqual(100)
        // rInside = min(50, 50) * tan(pi/4) = 50, so r = min(50, 100) = 50
        expect(result.currentRadius).toBeCloseTo(50, 5)
    })
})

describe('computeRoundedCorner turn direction', () => {
    it('reports a negative turnSign for the square corner (1,0)', () => {
        const result = computeRoundedCorner('polygon', 1, squarePoints, 4, 20)

        // cross(normStart, normEnd) = cross((-1,0), (0,1)) = -1
        expect(result.turnSign).toBeLessThan(0)
    })
})

describe('computeRoundedCorner star', () => {
    // narrow corner: start (-10,0), control (0,0), end (0,10)
    // rInside = min(10/2, 10/2) * tan(pi/4) = 5
    const starPoints = [
        { x: -10, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 10 },
    ]

    it('uses the un-clamped radius for even indices', () => {
        // i % 2 === 0 -> r = radius
        const result = computeRoundedCorner('star', 0, starPoints, 3, 8)
        expect(result.currentRadius).toBeCloseTo(8, 5)
    })

    it('uses min(rInside, radius) for odd indices', () => {
        // i % 2 === 1 -> r = min(5, 8) = 5
        const result = computeRoundedCorner('star', 1, starPoints, 3, 8)
        expect(result.currentRadius).toBeCloseTo(5, 5)
    })
})

describe('computeRoundedCorner validation', () => {
    it('throws when sides is less than 3', () => {
        expect(() => computeRoundedCorner('polygon', 1, squarePoints, 2, 20)).toThrow('Polygon must have at least 3 sides')
    })
})