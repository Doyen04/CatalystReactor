import { describe, expect, it } from 'vitest'
import SnapManager from '../core/SnapManager'
import type SceneNode from '../node/Scene'

const node = { id: 'target', getParent: () => null } as unknown as SceneNode

describe('SnapManager grid snapping', () => {
    it('snaps to the grid when within snap distance', () => {
        const snap = new SnapManager()
        snap.setConfiguration({ enableGrid: true, enableShapes: false, snapDistance: 8 })

        const result = snap.getSnapResult(node, { x: 23, y: 47 }, 10)

        expect(result.snapped).toBe(true)
        expect(result.x).toBe(20)
        expect(result.y).toBe(50)
        expect(result.guides).toHaveLength(2)
        expect(result.guides[0]).toEqual({ pos: 20, orientation: 'vertical', isGrid: true, type: 'grid' })
        expect(result.guides[1]).toEqual({ pos: 50, orientation: 'horizontal', isGrid: true, type: 'grid' })
        expect(result.indicators).toEqual([])
    })

    it('does not snap when out of range', () => {
        const snap = new SnapManager()
        snap.setConfiguration({ enableGrid: true, enableShapes: false, snapDistance: 2 })

        const result = snap.getSnapResult(node, { x: 25, y: 25 }, 10)

        expect(result.snapped).toBe(false)
        expect(result.x).toBe(25)
        expect(result.y).toBe(25)
        expect(result.guides).toEqual([])
        expect(result.indicators).toEqual([])
    })

    it('does not snap to the grid when the grid is disabled', () => {
        const snap = new SnapManager()
        snap.setConfiguration({ enableGrid: false, enableShapes: false, snapDistance: 20 })

        const result = snap.getSnapResult(node, { x: 33, y: 44 }, 10)

        expect(result.snapped).toBe(false)
        expect(result.x).toBe(33)
        expect(result.y).toBe(44)
        expect(result.guides).toEqual([])
    })

    it('keeps the position when already on a grid line', () => {
        const snap = new SnapManager()
        snap.setConfiguration({ enableGrid: true, enableShapes: false, snapDistance: 8 })

        const result = snap.getSnapResult(node, { x: 30, y: 40 }, 10)

        expect(result.snapped).toBe(true)
        expect(result.x).toBe(30)
        expect(result.y).toBe(40)
        expect(result.guides).toHaveLength(2)
        expect(result.guides.filter(g => g.isGrid)).toHaveLength(2)
    })

    it('respects a custom grid size', () => {
        const snap = new SnapManager()
        snap.setConfiguration({ enableGrid: true, enableShapes: false, snapDistance: 8 })

        const result = snap.getSnapResult(node, { x: 23, y: 47 }, 25)

        expect(result.snapped).toBe(true)
        expect(result.x).toBe(25)
        expect(result.y).toBe(50)
        expect(result.guides[0]).toEqual({ pos: 25, orientation: 'vertical', isGrid: true, type: 'grid' })
        expect(result.guides[1]).toEqual({ pos: 50, orientation: 'horizontal', isGrid: true, type: 'grid' })
    })
})
