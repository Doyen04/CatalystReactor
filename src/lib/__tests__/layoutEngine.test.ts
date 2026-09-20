import { describe, it, expect, vi } from 'vitest'
import type Shape from '@lib/shapes/base/Shape'
import type SceneNode from '@lib/node/Scene'
import type { LayoutConstraints } from '@lib/node/nodeTypes'
import { applyRowLayout, applyColumnLayout, applyGridLayout } from '@lib/node/LayoutEngine'

function makeShape(w: number, h: number) {
    const setDim = vi.fn()
    const shape = {
        getDim: () => ({ width: w, height: h }),
        setDim,
    }
    return { shape: shape as unknown as Shape, setDim }
}

function makeChild(w: number, h: number) {
    const setPosition = vi.fn()
    const setDimension = vi.fn()
    const child = {
        getDim: () => ({ width: w, height: h }),
        setPosition,
        setDimension,
    }
    return { child: child as unknown as SceneNode, setPosition, setDimension }
}

function makeNullChild() {
    const setPosition = vi.fn()
    const setDimension = vi.fn()
    const child = {
        getDim: () => null,
        setPosition,
        setDimension,
    }
    return { child: child as unknown as SceneNode, setPosition, setDimension }
}

function children(list: ReturnType<typeof makeChild>[]): SceneNode[] {
    return list.map(c => c.child)
}

function mixedChildren(list: (ReturnType<typeof makeChild> | ReturnType<typeof makeNullChild>)[]): SceneNode[] {
    return list.map(c => c.child)
}

describe('applyRowLayout', () => {
    it('mainAlign start positions children at 0 and childWidth+gap', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'start' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(60, 0)
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(b.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign center centers the row: x = (200 - 110) / 2 = 45', () => {
        const { shape } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'center' })

        expect(a.setPosition).toHaveBeenCalledWith(45, 0)
        expect(b.setPosition).toHaveBeenCalledWith(105, 0)
    })

    it('mainAlign space-between pushes children to the edges', () => {
        const { shape } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'space-between' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(140, 0)
    })

    it('crossAlign stretch resizes each child to container height', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'start', crossAlign: 'stretch' })

        expect(a.setDimension).toHaveBeenCalledWith(50, 100)
        expect(b.setDimension).toHaveBeenCalledWith(50, 100)
        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(60, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('auto-resizes container width when children overflow a start-aligned row', () => {
        const { shape, setDim } = makeShape(80, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'start' })

        expect(setDim).toHaveBeenCalledWith(110, 100)
        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(60, 0)
    })

    it('mainAlign end positions children right-aligned: x = 200 - 110 = 90', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'end' })

        expect(a.setPosition).toHaveBeenCalledWith(90, 0)
        expect(b.setPosition).toHaveBeenCalledWith(150, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign space-around: first child at 90/4 = 22.5, step is width + 2*22.5', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'space-around' })

        expect(a.setPosition).toHaveBeenCalledWith(22.5, 0)
        expect(b.setPosition).toHaveBeenCalledWith(117.5, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign space-evenly: first child at 90/3 = 30, step is width + 30', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'space-evenly' })

        expect(a.setPosition).toHaveBeenCalledWith(30, 0)
        expect(b.setPosition).toHaveBeenCalledWith(110, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('crossAlign center centers each child vertically: y = (100 - 30) / 2 = 35', () => {
        const { shape } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'center', crossAlign: 'center' })

        expect(a.setPosition).toHaveBeenCalledWith(45, 35)
        expect(b.setPosition).toHaveBeenCalledWith(105, 35)
    })

    it('crossAlign end aligns children to the bottom: y = 100 - 30 = 70', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: 'start', crossAlign: 'end' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 70)
        expect(b.setPosition).toHaveBeenCalledWith(60, 70)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('asymmetric padding shifts start positions and feeds the auto-resize total', () => {
        const { shape, setDim } = makeShape(160, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)
        const c = makeChild(50, 30)

        applyRowLayout(shape, children([a, b, c]), {
            type: 'row',
            gap: 5,
            mainAlign: 'start',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 10)
        expect(b.setPosition).toHaveBeenCalledWith(95, 10)
        expect(c.setPosition).toHaveBeenCalledWith(150, 10)
        expect(setDim).toHaveBeenCalledWith(220, 100)
    })

    it('asymmetric padding narrows availableWidth for center: cx = 40 + (140 - 105) / 2 = 57.5', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), {
            type: 'row',
            gap: 5,
            mainAlign: 'center',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(57.5, 10)
        expect(b.setPosition).toHaveBeenCalledWith(112.5, 10)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('asymmetric padding shifts mainAlign end from the right: x = 200 - 20 - 105 = 75', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), {
            type: 'row',
            gap: 5,
            mainAlign: 'end',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(75, 10)
        expect(b.setPosition).toHaveBeenCalledWith(130, 10)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('crossAlign stretch with asymmetric padding stretches to 100 - 10 - 30 = 60 tall', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), {
            type: 'row',
            gap: 5,
            mainAlign: 'start',
            crossAlign: 'stretch',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 10)
        expect(b.setPosition).toHaveBeenCalledWith(95, 10)
        expect(a.setDimension).toHaveBeenCalledWith(50, 60)
        expect(b.setDimension).toHaveBeenCalledWith(50, 60)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('never auto-resizes when mainAlign is not start, even when children overflow', () => {
        const cases = [
            { mainAlign: 'center', firstX: -15 },
            { mainAlign: 'end', firstX: -30 },
            { mainAlign: 'space-between', firstX: 0 },
            { mainAlign: 'space-around', firstX: -7.5 },
            { mainAlign: 'space-evenly', firstX: -10 },
        ] as const

        for (const c of cases) {
            const { shape, setDim } = makeShape(80, 100)
            const a = makeChild(50, 30)
            const b = makeChild(50, 30)

            applyRowLayout(shape, children([a, b]), { type: 'row', gap: 10, mainAlign: c.mainAlign })

            expect(a.setPosition).toHaveBeenCalledWith(c.firstX, 0)
            expect(setDim).not.toHaveBeenCalled()
        }
    })

    it('omitted gap and alignments default to gap 0, start, start', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)
        const b = makeChild(50, 30)

        applyRowLayout(shape, children([a, b]), { type: 'row' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(50, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('a null-dim child is skipped but a positional gap still lands in the totals', () => {
        const { shape, setDim } = makeShape(80, 100)
        const a = makeChild(50, 30)
        const none = makeNullChild()
        const b = makeChild(50, 30)

        applyRowLayout(shape, mixedChildren([a, none, b]), { type: 'row', gap: 10, mainAlign: 'start' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(60, 0)
        expect(none.setPosition).not.toHaveBeenCalled()
        expect(none.setDimension).not.toHaveBeenCalled()
        expect(setDim).toHaveBeenCalledWith(110, 100)
    })

    it('space-between with a single child falls back to the plain gap branch (start-like)', () => {
        const { shape, setDim } = makeShape(200, 100)
        const a = makeChild(50, 30)

        applyRowLayout(shape, children([a]), { type: 'row', gap: 10, mainAlign: 'space-between', padding: { top: 0, right: 0, bottom: 0, left: 40 } })

        expect(a.setPosition).toHaveBeenCalledWith(40, 0)
        expect(setDim).not.toHaveBeenCalled()
    })
})

describe('applyColumnLayout', () => {
    it('mainAlign start stacks children at 0 and childHeight+gap', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'start' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 60)
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(b.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign center centers the column: y = (200 - 110) / 2 = 45', () => {
        const { shape } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'center' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 45)
        expect(b.setPosition).toHaveBeenCalledWith(0, 105)
    })

    it('mainAlign space-between pushes children to the edges', () => {
        const { shape } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'space-between' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 140)
    })

    it('crossAlign stretch resizes each child to container width', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'start', crossAlign: 'stretch' })

        expect(a.setDimension).toHaveBeenCalledWith(100, 50)
        expect(b.setDimension).toHaveBeenCalledWith(100, 50)
        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 60)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('auto-resizes container height when children overflow a start-aligned column', () => {
        const { shape, setDim } = makeShape(100, 80)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'start' })

        expect(setDim).toHaveBeenCalledWith(100, 110)
        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 60)
    })

    it('mainAlign end stacks children bottom-aligned: y = 200 - 110 = 90', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'end' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 90)
        expect(b.setPosition).toHaveBeenCalledWith(0, 150)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign space-around: first child at 90/4 = 22.5, step is height + 2*22.5', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'space-around' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 22.5)
        expect(b.setPosition).toHaveBeenCalledWith(0, 117.5)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('mainAlign space-evenly: first child at 90/3 = 30, step is height + 30', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'space-evenly' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 30)
        expect(b.setPosition).toHaveBeenCalledWith(0, 110)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('crossAlign center centers each child horizontally: x = (100 - 30) / 2 = 35', () => {
        const { shape } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: 'center', crossAlign: 'center' })

        expect(a.setPosition).toHaveBeenCalledWith(35, 45)
        expect(b.setPosition).toHaveBeenCalledWith(35, 105)
    })

    it('crossAlign end aligns children right, honoring right padding: x = 100 - 30 - 20 = 50', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), {
            type: 'column',
            gap: 10,
            mainAlign: 'start',
            crossAlign: 'end',
            padding: { top: 0, right: 20, bottom: 0, left: 0 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(50, 0)
        expect(b.setPosition).toHaveBeenCalledWith(50, 60)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('asymmetric padding shifts start positions and feeds the auto-resize total', () => {
        const { shape, setDim } = makeShape(100, 120)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)
        const c = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b, c]), {
            type: 'column',
            gap: 5,
            mainAlign: 'start',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 10)
        expect(b.setPosition).toHaveBeenCalledWith(40, 65)
        expect(c.setPosition).toHaveBeenCalledWith(40, 120)
        expect(setDim).toHaveBeenCalledWith(100, 200)
    })

    it('asymmetric padding narrows availableHeight for center: cy = 10 + (160 - 105) / 2 = 37.5', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), {
            type: 'column',
            gap: 5,
            mainAlign: 'center',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 37.5)
        expect(b.setPosition).toHaveBeenCalledWith(40, 92.5)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('asymmetric padding shifts mainAlign end from the bottom: y = 200 - 30 - 105 = 65', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), {
            type: 'column',
            gap: 5,
            mainAlign: 'end',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 65)
        expect(b.setPosition).toHaveBeenCalledWith(40, 120)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('crossAlign stretch with asymmetric padding stretches to 100 - 40 - 20 = 40 wide', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), {
            type: 'column',
            gap: 5,
            mainAlign: 'start',
            crossAlign: 'stretch',
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(40, 10)
        expect(b.setPosition).toHaveBeenCalledWith(40, 65)
        expect(a.setDimension).toHaveBeenCalledWith(40, 50)
        expect(b.setDimension).toHaveBeenCalledWith(40, 50)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('never auto-resizes when mainAlign is not start, even when children overflow', () => {
        const cases = [
            { mainAlign: 'center', firstY: -15 },
            { mainAlign: 'end', firstY: -30 },
            { mainAlign: 'space-between', firstY: 0 },
            { mainAlign: 'space-around', firstY: -7.5 },
            { mainAlign: 'space-evenly', firstY: -10 },
        ] as const

        for (const c of cases) {
            const { shape, setDim } = makeShape(100, 80)
            const a = makeChild(30, 50)
            const b = makeChild(30, 50)

            applyColumnLayout(shape, children([a, b]), { type: 'column', gap: 10, mainAlign: c.mainAlign })

            expect(a.setPosition).toHaveBeenCalledWith(0, c.firstY)
            expect(setDim).not.toHaveBeenCalled()
        }
    })

    it('omitted gap and alignments default to gap 0, start, start', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)
        const b = makeChild(30, 50)

        applyColumnLayout(shape, children([a, b]), { type: 'column' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 50)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('a null-dim child is skipped but a positional gap still lands in the totals', () => {
        const { shape, setDim } = makeShape(100, 80)
        const a = makeChild(30, 50)
        const none = makeNullChild()
        const b = makeChild(30, 50)

        applyColumnLayout(shape, mixedChildren([a, none, b]), { type: 'column', gap: 10, mainAlign: 'start' })

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 60)
        expect(none.setPosition).not.toHaveBeenCalled()
        expect(none.setDimension).not.toHaveBeenCalled()
        expect(setDim).toHaveBeenCalledWith(100, 110)
    })

    it('space-between with a single child falls back to the plain gap branch (start-like)', () => {
        const { shape, setDim } = makeShape(100, 200)
        const a = makeChild(30, 50)

        applyColumnLayout(shape, children([a]), {
            type: 'column',
            gap: 10,
            mainAlign: 'space-between',
            padding: { top: 40, right: 0, bottom: 0, left: 0 },
        })

        expect(a.setPosition).toHaveBeenCalledWith(0, 40)
        expect(setDim).not.toHaveBeenCalled()
    })
})

describe('applyGridLayout', () => {
    it('lays out 4 children in a 2x2 grid with 95px cells', () => {
        const { shape, setDim } = makeShape(200, 200)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)
        const d = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: 2,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(105, 0)
        expect(c.setPosition).toHaveBeenCalledWith(0, 105)
        expect(d.setPosition).toHaveBeenCalledWith(105, 105)
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(b.setDimension).not.toHaveBeenCalled()
        expect(c.setDimension).not.toHaveBeenCalled()
        expect(d.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('shrinks oversized children to the 95px cell size', () => {
        const { shape, setDim } = makeShape(200, 200)
        const a = makeChild(500, 500)
        const b = makeChild(500, 500)
        const c = makeChild(500, 500)
        const d = makeChild(500, 500)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: 2,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(105, 0)
        expect(c.setPosition).toHaveBeenCalledWith(0, 105)
        expect(d.setPosition).toHaveBeenCalledWith(105, 105)
        expect(a.setDimension).toHaveBeenCalledWith(95, 95)
        expect(b.setDimension).toHaveBeenCalledWith(95, 95)
        expect(c.setDimension).toHaveBeenCalledWith(95, 95)
        expect(d.setDimension).toHaveBeenCalledWith(95, 95)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('with 1 column and 3 children derives rows and cell height', () => {
        const { shape, setDim } = makeShape(200, 200)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c]), {
            type: 'grid',
            gridTemplateColumns: 1,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(0, 70)
        expect(c.setPosition).toHaveBeenCalledWith(0, 140)
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(b.setDimension).not.toHaveBeenCalled()
        expect(c.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('gridTemplateColumns array sets column count and rows are derived by ceil(children/columns)', () => {
        const { shape, setDim } = makeShape(320, 210)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)
        const d = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: [1, 1, 1],
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(110, 0)
        expect(c.setPosition).toHaveBeenCalledWith(220, 0)
        expect(d.setPosition).toHaveBeenCalledWith(0, 110)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('gridTemplateRows as a number fixes the row count and cell height', () => {
        const { shape, setDim } = makeShape(300, 200)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)
        const d = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: 2,
            gridTemplateRows: 3,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(155, 0)
        expect(c.setPosition).toHaveBeenCalledWith(0, 70)
        expect(d.setPosition).toHaveBeenCalledWith(155, 70)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('gridTemplateRows array length wins over the derived ceil count', () => {
        const { shape, setDim } = makeShape(320, 210)
        const kids = [50, 50, 50, 50, 50, 50, 50].map(w => makeChild(w, 50))

        applyGridLayout(shape, children(kids), {
            type: 'grid',
            gridTemplateColumns: 3,
            gridTemplateRows: [1, 1],
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(kids[6].setPosition).toHaveBeenCalledWith(0, 220)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('omitted gridTemplateColumns falls back to ceil(sqrt(9)) = 3 columns', () => {
        const { shape, setDim } = makeShape(340, 340)
        const kids = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => makeChild(50, 50))

        applyGridLayout(shape, children(kids), {
            type: 'grid',
            gridColumnGap: 20,
            gridRowGap: 20,
        } as unknown as LayoutConstraints)

        expect(kids[0].setPosition).toHaveBeenCalledWith(0, 0)
        expect(kids[3].setPosition).toHaveBeenCalledWith(0, 120)
        expect(kids[8].setPosition).toHaveBeenCalledWith(240, 240)
        expect(kids[0].setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('non-numeric string gridTemplateColumns falls back to ceil(sqrt(6)) = 3 columns', () => {
        const { shape, setDim } = makeShape(260, 340)
        const kids = [0, 1, 2, 3, 4, 5].map(() => makeChild(50, 50))

        applyGridLayout(shape, children(kids), {
            type: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(kids[0].setPosition).toHaveBeenCalledWith(0, 0)
        expect(kids[1].setPosition).toHaveBeenCalledWith(90, 0)
        expect(kids[2].setPosition).toHaveBeenCalledWith(180, 0)
        expect(kids[5].setPosition).toHaveBeenCalledWith(180, 175)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('gridAutoFlow column fills columns first: col = floor(i/rows), row = i % rows', () => {
        const { shape, setDim } = makeShape(320, 210)
        const kids = [0, 1, 2, 3, 4].map(() => makeChild(50, 50))

        applyGridLayout(shape, children(kids), {
            type: 'grid',
            gridTemplateColumns: 3,
            gridTemplateRows: 2,
            gridAutoFlow: 'column',
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(kids[0].setPosition).toHaveBeenCalledWith(0, 0)
        expect(kids[1].setPosition).toHaveBeenCalledWith(0, 110)
        expect(kids[2].setPosition).toHaveBeenCalledWith(110, 0)
        expect(kids[4].setPosition).toHaveBeenCalledWith(220, 0)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('grid padding offsets child positions and available size (cells shrank to 115x85)', () => {
        const { shape, setDim } = makeShape(300, 220)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)
        const d = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: 2,
            gridTemplateRows: 2,
            gridColumnGap: 10,
            gridRowGap: 10,
            padding: { top: 10, right: 20, bottom: 30, left: 40 },
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(40, 10)
        expect(b.setPosition).toHaveBeenCalledWith(165, 10)
        expect(c.setPosition).toHaveBeenCalledWith(40, 105)
        expect(d.setPosition).toHaveBeenCalledWith(165, 105)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('does NOT auto-resize when required size exactly equals the container', () => {
        const { shape, setDim } = makeShape(200, 200)
        const a = makeChild(100, 100)
        const b = makeChild(100, 100)
        const c = makeChild(100, 100)
        const d = makeChild(100, 100)

        applyGridLayout(shape, children([a, b, c, d]), {
            type: 'grid',
            gridTemplateColumns: 2,
            gridTemplateRows: 2,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(105, 0)
        expect(a.setDimension).toHaveBeenCalledWith(95, 95)
        expect(setDim).not.toHaveBeenCalled()
    })

    it('auto-resizes only via float round-off: 19 cols/rows in a 21px container pushes required over', () => {
        const { shape, setDim } = makeShape(21, 21)
        const kids = Array.from({ length: 19 }, () => makeChild(1, 1))

        applyGridLayout(shape, children(kids), {
            type: 'grid',
            gridTemplateColumns: 19,
            gridTemplateRows: 19,
            gridColumnGap: 0,
            gridRowGap: 0,
        } as unknown as LayoutConstraints)

        expect(kids[0].setPosition).toHaveBeenCalledWith(0, 0)
        expect(kids[0].setDimension).not.toHaveBeenCalled()
        expect(setDim).toHaveBeenCalledWith(21.000000000000004, 21.000000000000004)
    })

    it('a null-dim grid child is skipped and does not take a cell', () => {
        const { shape, setDim } = makeShape(200, 200)
        const a = makeChild(50, 50)
        const none = makeNullChild()
        const c = makeChild(50, 50)

        applyGridLayout(shape, mixedChildren([a, none, c]), {
            type: 'grid',
            gridTemplateColumns: 1,
            gridColumnGap: 10,
            gridRowGap: 10,
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(c.setPosition).toHaveBeenCalledWith(0, 140)
        expect(none.setPosition).not.toHaveBeenCalled()
        expect(none.setDimension).not.toHaveBeenCalled()
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(c.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })

    it('omitted grid gaps default to 10', () => {
        const { shape, setDim } = makeShape(210, 110)
        const a = makeChild(50, 50)
        const b = makeChild(50, 50)
        const c = makeChild(50, 50)

        applyGridLayout(shape, children([a, b, c]), {
            type: 'grid',
            gridTemplateColumns: [1, 1],
        } as unknown as LayoutConstraints)

        expect(a.setPosition).toHaveBeenCalledWith(0, 0)
        expect(b.setPosition).toHaveBeenCalledWith(110, 0)
        expect(c.setPosition).toHaveBeenCalledWith(0, 60)
        expect(a.setDimension).not.toHaveBeenCalled()
        expect(setDim).not.toHaveBeenCalled()
    })
})
