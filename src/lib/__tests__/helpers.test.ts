import { describe, expect, it } from 'vitest'
import type { HandlePos } from '@lib/types/shapes'
import clamp from '@lib/helper/clamp'
import { normalizeAngle } from '@lib/helper/normalise'
import { getHandleLocalPoint, getOppositeHandle } from '@lib/helper/handleUtil'
import { arcPointAtFraction, getArcParameters } from '@lib/helper/pointInArc'

describe('clamp', () => {
    it('returns the value unchanged when it is inside the range', () => {
        expect(clamp(5, 0, 10)).toBe(5)
    })

    it('returns the min when the value is below it', () => {
        expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('returns the max when the value is above it', () => {
        expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles min === max as a fixed point', () => {
        expect(clamp(7, 5, 5)).toBe(5)
        expect(clamp(3, 5, 5)).toBe(5)
        expect(clamp(5, 5, 5)).toBe(5)
    })

    it('throws a RangeError when min is greater than max', () => {
        expect(() => clamp(3, 10, 5)).toThrow(RangeError)
    })
})

describe('normalizeAngle', () => {
    it('leaves 0 alone', () => {
        expect(normalizeAngle(0)).toBeCloseTo(0, 10)
    })

    it('leaves π/2 alone', () => {
        expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10)
    })

    it('wraps -π/2 to 3π/2', () => {
        expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 10)
    })

    it('wraps 2π to 0', () => {
        expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 10)
    })

    it('wraps 5π to π', () => {
        expect(normalizeAngle(5 * Math.PI)).toBeCloseTo(Math.PI, 10)
    })

    it('wraps -7π/2 to π/2', () => {
        expect(normalizeAngle((-7 * Math.PI) / 2)).toBeCloseTo(Math.PI / 2, 10)
    })
})

describe('getOppositeHandle', () => {
    it('maps top-left to bottom-right and back', () => {
        expect(getOppositeHandle('top-left')).toBe('bottom-right')
        expect(getOppositeHandle('bottom-right')).toBe('top-left')
    })

    it('maps top-right to bottom-left and back', () => {
        expect(getOppositeHandle('top-right')).toBe('bottom-left')
        expect(getOppositeHandle('bottom-left')).toBe('top-right')
    })

    it('maps top to bottom and back', () => {
        expect(getOppositeHandle('top')).toBe('bottom')
        expect(getOppositeHandle('bottom')).toBe('top')
    })

    it('maps left to right and back', () => {
        expect(getOppositeHandle('left')).toBe('right')
        expect(getOppositeHandle('right')).toBe('left')
    })

    it('returns bottom-right as the fallback for an unrecognized position', () => {
        expect(getOppositeHandle('north-east' as unknown as HandlePos)).toBe('bottom-right')
    })
})

describe('getHandleLocalPoint', () => {
    const width = 100
    const height = 60

    it('places the four corners at the box corners', () => {
        expect(getHandleLocalPoint('top-left', width, height)).toEqual({ x: 0, y: 0 })
        expect(getHandleLocalPoint('top-right', width, height)).toEqual({ x: 100, y: 0 })
        expect(getHandleLocalPoint('bottom-left', width, height)).toEqual({ x: 0, y: 60 })
        expect(getHandleLocalPoint('bottom-right', width, height)).toEqual({ x: 100, y: 60 })
    })

    it('places the edge midpoints on the edges', () => {
        const top = getHandleLocalPoint('top', width, height)
        expect(top.x).toBeCloseTo(50, 10)
        expect(top.y).toBeCloseTo(0, 10)

        const bottom = getHandleLocalPoint('bottom', width, height)
        expect(bottom.x).toBeCloseTo(50, 10)
        expect(bottom.y).toBeCloseTo(60, 10)

        const left = getHandleLocalPoint('left', width, height)
        expect(left.x).toBeCloseTo(0, 10)
        expect(left.y).toBeCloseTo(30, 10)

        const right = getHandleLocalPoint('right', width, height)
        expect(right.x).toBeCloseTo(100, 10)
        expect(right.y).toBeCloseTo(30, 10)
    })

    it('defaults to the bottom-right corner for an unrecognized position', () => {
        const fallback = getHandleLocalPoint('north-east' as unknown as HandlePos, width, height)
        expect(fallback.x).toBeCloseTo(100, 10)
        expect(fallback.y).toBeCloseTo(60, 10)
    })
})

describe('getArcParameters', () => {
    const center = { x: 0, y: 0 }
    const radius = 10
    const start = { x: 10, y: 0 } // angle 0
    const end = { x: 0, y: 10 } // angle π/2

    it('returns center, radius, startAngle and a positive CCW delta for a right turn', () => {
        const params = getArcParameters(start, end, center, radius, -1)
        expect(params.center).toEqual(center)
        expect(params.radius).toBeCloseTo(10, 10)
        expect(params.startAngle).toBeCloseTo(0, 10)
        expect(params.deltaAngle).toBeCloseTo(Math.PI / 2, 10)
    })

    it('produces a negative sweep delta for a clockwise (left) turn, positive turnSign', () => {
        const params = getArcParameters(start, end, center, radius, 1)
        expect(params.center).toEqual(center)
        expect(params.startAngle).toBeCloseTo(0, 10)
        expect(params.deltaAngle).toBeCloseTo((-3 * Math.PI) / 2, 10)
        expect(params.deltaAngle).toBeLessThan(0)
    })
})

describe('arcPointAtFraction', () => {
    const center = { x: 0, y: 0 }
    const radius = 10
    const start = { x: 10, y: 0 }
    const end = { x: 0, y: 10 }

    it('places fraction 0 at the start angle on the circle', () => {
        const p = arcPointAtFraction(start, end, center, radius, -1, 0)
        expect(p.x).toBeCloseTo(10, 10)
        expect(p.y).toBeCloseTo(0, 10)
        expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 10)
    })

    it('places fraction 1 at the final angle on the circle', () => {
        const p = arcPointAtFraction(start, end, center, radius, -1, 1)
        expect(p.x).toBeCloseTo(0, 10)
        expect(p.y).toBeCloseTo(10, 10)
        expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 10)
    })

    it('angles fraction 0.5 at the arc midpoint', () => {
        const p = arcPointAtFraction(start, end, center, radius, -1, 0.5)
        expect(p.x).toBeCloseTo(10 * Math.cos(Math.PI / 4), 10)
        expect(p.y).toBeCloseTo(10 * Math.sin(Math.PI / 4), 10)
        expect(Math.atan2(p.y, p.x)).toBeCloseTo(Math.PI / 4, 10)
        expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 10)
    })

    it('clamps fractions below 0 to the start', () => {
        const p = arcPointAtFraction(start, end, center, radius, -1, -1)
        expect(p.x).toBeCloseTo(10, 10)
        expect(p.y).toBeCloseTo(0, 10)
    })

    it('clamps fractions above 1 to the end', () => {
        const p = arcPointAtFraction(start, end, center, radius, -1, 2)
        expect(p.x).toBeCloseTo(0, 10)
        expect(p.y).toBeCloseTo(10, 10)
    })

    it('follows the negative sweep for a clockwise turn', () => {
        const p = arcPointAtFraction(start, end, center, radius, 1, 0.5)
        expect(p.x).toBeCloseTo(-10 * Math.cos(Math.PI / 4), 10)
        expect(p.y).toBeCloseTo(-10 * Math.sin(Math.PI / 4), 10)
        expect(Math.atan2(p.y, p.x)).toBeCloseTo((-3 * Math.PI) / 4, 10)
    })
})