import { afterEach, describe, expect, it, vi } from 'vitest'
import ShapeModifier from '../modifiers/ShapeModifier'
import { CanvasKitResources } from '../core/CanvasKitResource'
import { getHandleLocalPoint } from '../helper/handleUtil'
import type PaintManager from '../core/PaintManager'
import type SceneNode from '../node/Scene'

// Self-consistent row-major 3x3 affine stand-in for CanvasKit's Matrix, so the
// fixed-handle pinning math can be exercised without WASM. All methods share the
// same convention: mapPoints(m, p) applies m to a column vector, multiply(...) folds
// left (T*R*S applies S first), matching how Scene.buildZeroTransform / recomputeLocalMatrix compose.
type Mat = number[]

const Matrix = {
    identity: (): Mat => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    translated: (dx: number, dy: number): Mat => [1, 0, dx, 0, 1, dy, 0, 0, 1],
    rotated: (rad: number, px: number, py: number): Mat => {
        const c = Math.cos(rad)
        const s = Math.sin(rad)
        return [c, -s, px - c * px + s * py, s, c, py - s * px - c * py, 0, 0, 1]
    },
    scaled: (sx: number, sy: number, px: number, py: number): Mat => [sx, 0, px - sx * px, 0, sy, py - sy * py, 0, 0, 1],
    multiply: (...ms: Mat[]): Mat =>
        ms.reduce((a, b) => {
            const c = new Array(9)
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    c[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
                }
            }
            return c
        }),
    mapPoints: (m: Mat, pts: number[]): number[] => {
        const [x, y] = pts
        const w = m[6] * x + m[7] * y + m[8]
        return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]
    },
    invert: (m: Mat): Mat | null => {
        const [a, b, c, d, e, f, g, h, i] = m
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
        if (Math.abs(det) < 1e-12) return null
        return [
            (e * i - f * h) / det,
            (c * h - b * i) / det,
            (b * f - c * e) / det,
            (f * g - d * i) / det,
            (a * i - c * g) / det,
            (c * d - a * f) / det,
            (d * h - e * g) / det,
            (b * g - a * h) / det,
            (a * e - b * d) / det,
        ]
    },
}

const ROT = 0.5
const P0 = { x: 100, y: 80 }
const D0 = { width: 100, height: 50 }
const ANCHOR = { x: 0.5, y: 0.5 }

const ax0 = D0.width * ANCHOR.x
const ay0 = D0.height * ANCHOR.y
const local0 = Matrix.multiply(Matrix.translated(P0.x, P0.y), Matrix.rotated(ROT, ax0, ay0), Matrix.scaled(1, 1, ax0, ay0))

// The initial world position of the FIXED (opposite) handle — the pin target.
// Dragging size-bottom-right pins size-top-left, whose local point is (0,0).
const FIXED_KEY = 'top-left'
const fixedWorld = Matrix.mapPoints(local0, [0, 0])

const toWorld = (lx: number, ly: number): [number, number] => {
    const p = Matrix.mapPoints(local0, [lx, ly])
    return [p[0], p[1]]
}

// Replicates Scene.recomputeLocalMatrix + handle draw to read where the fixed
// handle actually renders for a given stored state — independent of updateShapeDim.
function renderFixedHandle(stored: { position: { x: number; y: number }; scale: { x: number; y: number }; dimension: { width: number; height: number } }): [number, number] {
    const ax = stored.dimension.width * ANCHOR.x
    const ay = stored.dimension.height * ANCHOR.y
    const local = Matrix.multiply(
        Matrix.translated(stored.position.x, stored.position.y),
        Matrix.rotated(ROT, ax, ay),
        Matrix.scaled(stored.scale.x, stored.scale.y, ax, ay)
    )
    const hl = getHandleLocalPoint(FIXED_KEY, stored.dimension.width, stored.dimension.height)
    const p = Matrix.mapPoints(local, [hl.x, hl.y])
    return [p[0], p[1]]
}

function makeScene() {
    return {
        getDim: () => ({ ...D0 }),
        getCoord: () => ({ ...P0 }),
        getWorldMatrix: () => local0,
        getLocalMatrix: () => local0,
        getScale: () => ({ x: 1, y: 1 }),
        getRotationAngle: () => ROT,
        getRotationAnchorPoint: () => ({ ...ANCHOR }),
        getArcAngles: () => null,
        worldToLocal: (x: number, y: number) => ({ x, y }),
        buildZeroTransform: (w: number, h: number, rot: number, sc: { x: number; y: number }, anc: { x: number; y: number }) => {
            const ax = w * (anc?.x ?? 0.5)
            const ay = h * (anc?.y ?? 0.5)
            return Matrix.multiply(Matrix.rotated(rot || 0, ax, ay), Matrix.scaled(sc?.x ?? 1, sc?.y ?? 1, ax, ay))
        },
        setPosition: vi.fn(),
        updateScene: vi.fn(),
        shape: { hitTestModifierHandle: () => 'size-bottom-right' },
    }
}

describe('rotated resize keeps the fixed handle steady', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('does not jitter the pinned handle across drag frames when rotated', () => {
        vi.spyOn(CanvasKitResources, 'getInstance').mockReturnValue({ canvasKit: { Matrix } } as never)

        const modifier = new ShapeModifier(null as unknown as PaintManager)
        const scene = makeScene()
        modifier.attachShape(scene as unknown as SceneNode)

        expect(modifier.selectModifier(0, 0)).toBe('size-bottom-right')

        const dragStart = { x: toWorld(D0.width, D0.height)[0], y: toWorld(D0.width, D0.height)[1] }
        modifier.handleMouseDown(dragStart, { offsetX: dragStart.x, offsetY: dragStart.y } as MouseEvent)

        // Grow the shape to fractional target sizes; the pinned handle must not move.
        const targets: [number, number][] = [
            [130.3, 62.7],
            [141.6, 70.2],
            [120.9, 81.4],
            [160.3, 90.6],
            [155.5, 66.8],
        ]

        for (const [w, h] of targets) {
            const [wx, wy] = toWorld(w, h)
            scene.updateScene.mockClear()
            modifier.dragHandle(dragStart, { offsetX: wx, offsetY: wy } as MouseEvent)

            expect(scene.updateScene).toHaveBeenCalledTimes(1)
            const stored = scene.updateScene.mock.calls[0][0] as {
                position: { x: number; y: number }
                scale: { x: number; y: number }
                dimension: { width: number; height: number }
            }

            const [fx, fy] = renderFixedHandle(stored)
            expect(fx).toBeCloseTo(fixedWorld[0], 5)
            expect(fy).toBeCloseTo(fixedWorld[1], 5)
        }
    })
})
