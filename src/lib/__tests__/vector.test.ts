import { describe, expect, it } from 'vitest'
import Vector from '@lib/helper/vector'

describe('Vector.add', () => {
    it('adds components correctly', () => {
        expect(Vector.add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    })

    it('handles negative components', () => {
        expect(Vector.add({ x: -1, y: -2 }, { x: 3, y: -4 })).toEqual({ x: 2, y: -6 })
    })
})

describe('Vector.subtract', () => {
    it('subtracts components correctly', () => {
        expect(Vector.subtract({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 })
    })

    it('handles negative results', () => {
        expect(Vector.subtract({ x: 1, y: 1 }, { x: 3, y: 4 })).toEqual({ x: -2, y: -3 })
    })
})

describe('Vector.scale', () => {
    it('scales by a positive scalar', () => {
        expect(Vector.scale({ x: 2, y: 3 }, 2)).toEqual({ x: 4, y: 6 })
    })

    it('scales by a negative scalar', () => {
        expect(Vector.scale({ x: 2, y: 3 }, -1)).toEqual({ x: -2, y: -3 })
    })

    it('scales by zero to the zero vector', () => {
        expect(Vector.scale({ x: 2, y: 3 }, 0)).toEqual({ x: 0, y: 0 })
    })

    it('scales fractional components', () => {
        expect(Vector.scale({ x: 2, y: 3 }, 0.5)).toEqual({ x: 1, y: 1.5 })
    })
})

describe('Vector.length', () => {
    it('is 5 for the 3-4-5 triple', () => {
        expect(Vector.length({ x: 3, y: 4 })).toBeCloseTo(5, 10)
    })

    it('is 0 for the zero vector', () => {
        expect(Vector.length({ x: 0, y: 0 })).toBe(0)
    })
})

describe('Vector.normalize', () => {
    it('returns a unit vector whose length is about 1', () => {
        const unit = Vector.normalize({ x: 3, y: 4 })
        expect(unit.x).toBeCloseTo(0.6, 10)
        expect(unit.y).toBeCloseTo(0.8, 10)
        expect(Vector.length(unit)).toBeCloseTo(1, 10)
    })

    it('keeps the zero vector as-is via the |hypot| || 1 guard', () => {
        expect(Vector.normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    })
})

describe('Vector.dot', () => {
    it('is positive for parallel vectors', () => {
        expect(Vector.dot({ x: 3, y: 4 }, { x: 6, y: 8 })).toBe(50)
    })

    it('is 0 for perpendicular vectors', () => {
        expect(Vector.dot({ x: 2, y: 0 }, { x: 0, y: 5 })).toBe(0)
    })

    it('is negative for anti-parallel vectors', () => {
        expect(Vector.dot({ x: 1, y: 2 }, { x: -2, y: -4 })).toBe(-10)
    })
})

describe('Vector.cross', () => {
    it('is positive when b is counter-clockwise of a', () => {
        expect(Vector.cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1)
    })

    it('is negative when b is clockwise of a', () => {
        expect(Vector.cross({ x: 0, y: 1 }, { x: 1, y: 0 })).toBe(-1)
    })

    it('is 0 for parallel vectors', () => {
        expect(Vector.cross({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0)
    })
})

describe('Vector.leftNormal', () => {
    it('returns (-y, x)', () => {
        expect(Vector.leftNormal({ x: 1, y: 2 })).toEqual({ x: -2, y: 1 })
    })

    it('is a 90 degree counter-clockwise rotation that preserves length', () => {
        const n = Vector.leftNormal({ x: 3, y: 4 })
        expect(n).toEqual({ x: -4, y: 3 })
        expect(Vector.length(n)).toBeCloseTo(5, 10)
        expect(Vector.dot({ x: 3, y: 4 }, n)).toBeCloseTo(0, 10)
        expect(Vector.cross({ x: 3, y: 4 }, n)).toBeGreaterThan(0)
    })
})

describe('Vector.rightNormal', () => {
    it('returns (y, -x)', () => {
        expect(Vector.rightNormal({ x: 1, y: 2 })).toEqual({ x: 2, y: -1 })
    })

    it('is a 90 degree clockwise rotation that preserves length', () => {
        const n = Vector.rightNormal({ x: 3, y: 4 })
        expect(n).toEqual({ x: 4, y: -3 })
        expect(Vector.length(n)).toBeCloseTo(5, 10)
        expect(Vector.dot({ x: 3, y: 4 }, n)).toBeCloseTo(0, 10)
        expect(Vector.cross({ x: 3, y: 4 }, n)).toBeLessThan(0)
    })
})