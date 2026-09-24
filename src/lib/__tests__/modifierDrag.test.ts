import { afterEach, describe, expect, it, vi } from 'vitest'
import ShapeModifier from '../modifiers/ShapeModifier'
import { CanvasKitResources } from '../core/CanvasKitResource'
import type PaintManager from '../core/PaintManager'
import type SceneNode from '../node/Scene'

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]

function fakeResource() {
    return {
        canvasKit: {
            Matrix: {
                invert: () => identity,
                mapPoints: (_m: number[], pts: number[]) => pts,
                rotated: () => identity,
                scaled: () => identity,
                multiply: () => identity,
            },
        },
    }
}

/**
 * Regression harness for the storeShapeInitialShapeData guard.
 *
 * The guard once used truthiness on `rotation`, so every UNROTATED shape
 * (rotation === 0) bailed before snapshotting `initialShapeData`. Because both
 * dragShape (shape move) and handleModifierDrag (modifier resize/rotate) early
 * return on !initialShapeData, a single falsy check killed both interactions.
 */
function makeScene(rotation: number) {
    return {
        getDim: () => ({ width: 100, height: 50 }),
        getCoord: () => ({ x: 10, y: 20 }),
        getWorldMatrix: () => identity,
        getLocalMatrix: () => identity,
        getScale: () => ({ x: 1, y: 1 }),
        getRotationAngle: () => rotation,
        getRotationAnchorPoint: () => ({ x: 0.5, y: 0.5 }),
        getArcAngles: () => null,
        worldToLocal: (x: number, y: number) => ({ x, y }),
        buildZeroTransform: () => identity,
        setPosition: vi.fn(),
        updateScene: vi.fn(),
        shape: { hitTestModifierHandle: () => 'size-bottom-right' },
    }
}

const mouse = (offsetX: number, offsetY: number) => ({ offsetX, offsetY }) as MouseEvent

describe('ShapeModifier drag snapshot (rotation === 0)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('dragShape moves an unrotated shape', () => {
        vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue(fakeResource() as never)

        const modifier = new ShapeModifier(null as unknown as PaintManager)
        const scene = makeScene(0)
        modifier.attachShape(scene as unknown as SceneNode)

        modifier.handleMouseDown({ x: 0, y: 0 }, mouse(0, 0))
        modifier.dragShape({ x: 0, y: 0 }, mouse(30, 40))

        expect(scene.setPosition).toHaveBeenCalledWith(40, 60)
    })

    it('dragHandle resizes an unrotated shape through the modifier handle', () => {
        vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue(fakeResource() as never)

        const modifier = new ShapeModifier(null as unknown as PaintManager)
        const scene = makeScene(0)
        modifier.attachShape(scene as unknown as SceneNode)

        expect(modifier.selectModifier(0, 0)).toBe('size-bottom-right')
        expect(modifier.hasSelectedHandle()).toBe(true)

        modifier.handleMouseDown({ x: 0, y: 0 }, mouse(100, 50))
        modifier.dragHandle({ x: 0, y: 0 }, mouse(120, 70))

        expect(scene.updateScene).toHaveBeenCalled()
    })

    it('does still snapshot a rotated shape (guard is null-check, not truthiness)', () => {
        vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue(fakeResource() as never)

        const modifier = new ShapeModifier(null as unknown as PaintManager)
        const scene = makeScene(Math.PI / 4)
        modifier.attachShape(scene as unknown as SceneNode)

        modifier.handleMouseDown({ x: 0, y: 0 }, mouse(0, 0))
        modifier.dragShape({ x: 0, y: 0 }, mouse(10, 10))

        expect(scene.setPosition).toHaveBeenCalledWith(20, 30)
    })
})
