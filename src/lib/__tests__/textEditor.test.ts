import { describe, it, expect } from 'vitest'
import TextEditor from '@lib/shapes/base/TextEditor'

const defaultStyle = {
    textFill: { color: { type: 'solid', color: [0, 0, 0, 1] }, opacity: 1 },
    textAlign: 'left',
    fontSize: 18,
    fontWeight: 500,
    fontFamilies: ['Antonio', 'sans-serif'],
    lineHeight: 1.2,
}

describe('TextEditor', () => {
    describe('setText', () => {
        it('creates a single span covering the whole string', () => {
            const ed = new TextEditor()
            const id = ed.setText('hello')
            expect(id).toBe('span_1')
            expect(ed.getText()).toBe('hello')
            expect(ed.getLength()).toBe(5)
            expect(ed.getStyledRuns()).toEqual([{ text: 'hello', start: 0, end: 5, style: defaultStyle, spanId: 'span_1' }])
            expect(ed.getIndexMap()).toEqual([{ id: 'span_1', start: 0, end: 5 }])
            expect(ed.getSpanStyle('span_1')).toEqual(defaultStyle)
        })

        it('applies a partial style patch on top of the default', () => {
            const ed = new TextEditor()
            ed.setText('hi', { fontSize: 24, fontWeight: 700 })
            const run = ed.getStyledRuns()[0]
            expect(run.style.fontSize).toBe(24)
            expect(run.style.fontWeight).toBe(700)
            expect(run.style.textAlign).toBe('left')
            expect(run.style.lineHeight).toBe(1.2)
            expect(run.style.fontFamilies).toEqual(['Antonio', 'sans-serif'])
            expect(run.style.textFill).toEqual(defaultStyle.textFill)
        })

        it('replaces previous content and keeps serial ids', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            const id = ed.setText('world')
            expect(id).toBe('span_2')
            expect(ed.getText()).toBe('world')
            expect(ed.getStyledRuns()).toHaveLength(1)
            expect(ed.getSpanStyle('span_1')).toBeUndefined()
        })

        it('handles empty text', () => {
            const ed = new TextEditor()
            ed.setText('')
            expect(ed.getText()).toBe('')
            expect(ed.getLength()).toBe(0)
            expect(ed.getStyledRuns()).toEqual([{ text: '', start: 0, end: 0, style: defaultStyle, spanId: 'span_1' }])
        })
    })

    describe('fresh editor', () => {
        it('starts empty', () => {
            const ed = new TextEditor()
            expect(ed.getText()).toBe('')
            expect(ed.getLength()).toBe(0)
            expect(ed.getStyledRuns()).toEqual([])
            expect(ed.getIndexMap()).toEqual([])
        })
    })

    describe('insertText', () => {
        it('appends at the end and inherits the last style', () => {
            const ed = new TextEditor()
            ed.setText('hello', { fontSize: 24 })
            const id = ed.insertText(5, ' world')
            expect(id).toBe('span_2')
            expect(ed.getText()).toBe('hello world')
            expect(ed.getLength()).toBe(11)
            const runs = ed.getStyledRuns()
            expect(runs).toHaveLength(2)
            expect(runs[0]).toEqual({ text: 'hello', start: 0, end: 5, style: { ...defaultStyle, fontSize: 24 }, spanId: 'span_1' })
            expect(runs[1]).toEqual({
                text: ' world',
                start: 5,
                end: 11,
                style: { ...defaultStyle, fontSize: 24 },
                spanId: 'span_2',
            })
        })

        it('merges equal-style spans when inserting in the middle', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            ed.insertText(2, 'XX')
            expect(ed.getText()).toBe('heXXllo')
            expect(ed.getLength()).toBe(7)
            expect(ed.getStyledRuns()).toEqual([{ text: 'heXXllo', start: 0, end: 7, style: defaultStyle, spanId: 'span_1' }])
        })

        it('returns an id that is removed from the map when the span is merged away', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            const id = ed.insertText(2, 'XX')
            expect(id).toBe('span_3')
            expect(ed.getSpanStyle(id)).toBeUndefined()
            expect(ed.getIndexMap().some(e => e.id === id)).toBe(false)
        })

        it('inserts at offset zero and merges into one run', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            ed.insertText(0, 'Z')
            expect(ed.getText()).toBe('Zhello')
            expect(ed.getStyledRuns()).toEqual([{ text: 'Zhello', start: 0, end: 6, style: defaultStyle, spanId: 'span_2' }])
        })

        it('clamps oversized offsets to a trailing append', () => {
            const ed = new TextEditor()
            ed.setText('abc')
            ed.insertText(10, 'D')
            expect(ed.getText()).toBe('abcD')
            expect(ed.getLength()).toBe(4)
        })

        it('clamps negative offsets to the start', () => {
            const ed = new TextEditor()
            ed.setText('abc')
            ed.insertText(-1, 'X')
            expect(ed.getText()).toBe('Xabc')
        })
    })

    describe('deleteRange', () => {
        it('removes up to the end', () => {
            const ed = new TextEditor()
            ed.setText('abcdef')
            ed.deleteRange(4, 6)
            expect(ed.getText()).toBe('abcd')
            expect(ed.getStyledRuns()).toEqual([{ text: 'abcd', start: 0, end: 4, style: defaultStyle, spanId: 'span_1' }])
        })

        it('removes the whole document', () => {
            const ed = new TextEditor()
            ed.setText('abc')
            ed.deleteRange(0, 3)
            expect(ed.getText()).toBe('')
            expect(ed.getLength()).toBe(0)
            expect(ed.getStyledRuns()).toEqual([])
        })

        it('is a no-op when start >= end', () => {
            const ed = new TextEditor()
            ed.setText('abc')
            ed.deleteRange(2, 2)
            ed.deleteRange(3, 1)
            expect(ed.getText()).toBe('abc')
            expect(ed.getLength()).toBe(3)
        })
    })

    describe('applyStyle', () => {
        it('styles the whole range as a single run', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            ed.applyStyle(0, 5, { fontWeight: 700 })
            expect(ed.getStyledRuns()).toEqual([{ text: 'hello', start: 0, end: 5, style: { ...defaultStyle, fontWeight: 700 }, spanId: 'span_1' }])
        })

        it('is a no-op for empty or reversed ranges', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            ed.applyStyle(2, 2, { fontWeight: 700 })
            ed.applyStyle(4, 1, { fontWeight: 700 })
            expect(ed.getLength()).toBe(5)
            expect(ed.getStyledRuns()).toHaveLength(1)
            expect(ed.getStyledRuns()[0].style.fontWeight).toBe(500)
        })
    })

    describe('getters', () => {
        it('returns undefined for unknown span ids', () => {
            const ed = new TextEditor()
            ed.setText('hello')
            expect(ed.getSpanStyle('nope')).toBeUndefined()
        })

        it('joins getText across unmerged spans', () => {
            const ed = new TextEditor()
            ed.setText('ab')
            ed.insertText(2, 'cd')
            ed.insertText(4, 'ef')
            expect(ed.getText()).toBe('abcdef')
            expect(ed.getLength()).toBe(6)
        })
    })
})
