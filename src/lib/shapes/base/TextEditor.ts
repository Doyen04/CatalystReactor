import { PTextSpan, PTextStyle } from "@lib/types/shapes"

class TextEditor {
    // Spans by id
    private textSpan: Map<string, PTextSpan>;
    // Per-span styles (key == span id)
    private styles: Map<string, PTextStyle>;
    // Real-world ordering of text
    private indexMap: { id: string, start: number, end: number }[];
    private defaultStyle: PTextStyle;
    private idSeq = 0;

    constructor() {
        this.defaultStyle = {
            textFill: { color: { type: 'solid', color: [0, 0, 0, 1] }, opacity: 1 },
            textAlign: 'left',
            fontSize: 18,
            fontWeight: 500,
            fontFamilies: ['Antonio', 'sans-serif'],
            lineHeight: 1.2,
        }
        this.textSpan = new Map()
        this.styles = new Map()
        this.indexMap = []
    }

    // Public API

    setText(text: string, style?: Partial<PTextStyle>) {
        this.clear()
        const id = this.genId('span')
        const span: PTextSpan = { text, start: 0, end: text.length }
        this.textSpan.set(id, span)
        this.indexMap.push({ id, start: 0, end: text.length })
        this.styles.set(id, this.mergeStyle(this.defaultStyle, style))
        return id
    }

    getText(): string {
        return this.indexMap.map(e => this.textSpan.get(e.id)?.text ?? '').join('')
    }

    getLength(): number {
        return this.indexMap.length ? this.indexMap[this.indexMap.length - 1].end : 0
    }

    insertText(offset: number, text: string, style?: Partial<PTextStyle>) {
        offset = this.clamp(offset, 0, this.getLength())

        // If appending, use style provided or inherit from last span
        if (offset === this.getLength()) {
            const id = this.genId('span')
            const start = offset
            const end = start + text.length
            const span: PTextSpan = { text, start, end }
            this.textSpan.set(id, span)
            const inherit = this.lastSpanStyle() ?? this.defaultStyle
            this.styles.set(id, this.mergeStyle(inherit, style))
            this.indexMap.push({ id, start, end })
            return id
        }

        // Create insertion boundary
        this.splitAt(offset)

        // Insert new span at boundary
        const insertIdx = this.indexMap.findIndex(e => e.start === offset)
        const id = this.genId('span')
        const entryBefore = this.indexMap[insertIdx - 1]
        const start = entryBefore ? entryBefore.end : 0
        const end = start + text.length
        const span: PTextSpan = { text, start, end }
        this.textSpan.set(id, span)

        // Inherit style from neighbor at offset if not provided
        const baseStyle = this.getStyleAt(offset) ?? this.defaultStyle
        this.styles.set(id, this.mergeStyle(baseStyle, style))

        // Insert and shift
        this.indexMap.splice(insertIdx, 0, { id, start, end })
        this.shiftFrom(insertIdx + 1, text.length)

        // Merge with neighbors if style matches
        this.tryMergeAround(Math.max(0, insertIdx - 1))
        return id
    }

    deleteRange(start: number, end: number) {
        const len = this.getLength()
        start = this.clamp(start, 0, len)
        end = this.clamp(end, 0, len)
        if (start >= end) return

        // Clean boundaries
        this.splitAt(end)
        this.splitAt(start)

        // Remove spans fully inside [start, end)
        let i = 0
        while (i < this.indexMap.length) {
            const e = this.indexMap[i]
            if (e.start >= start && e.end <= end) {
                this.textSpan.delete(e.id)
                this.styles.delete(e.id)
                this.indexMap.splice(i, 1)
            } else {
                i++
            }
        }

        // Shift subsequent
        const removed = end - start
        const shiftIdx = this.indexMap.findIndex(e => e.start >= end)
        if (shiftIdx !== -1) this.shiftFrom(shiftIdx, -removed)

        // Clip the last span before start
        const beforeIdx = this.lastIndexBefore(start)
        if (beforeIdx !== -1) {
            const e = this.indexMap[beforeIdx]
            const span = this.textSpan.get(e.id)!
            const keepLen = start - e.start
            span.text = span.text.slice(0, keepLen)
            span.end = start
            e.end = start
        }

        // Merge neighbors
        this.tryMergeAround(Math.max(0, beforeIdx - 1))
    }

    applyStyle(rangeStart: number, rangeEnd: number, style: Partial<PTextStyle>) {
        const len = this.getLength()
        rangeStart = this.clamp(rangeStart, 0, len)
        rangeEnd = this.clamp(rangeEnd, 0, len)
        if (rangeStart >= rangeEnd) return

        // Boundaries
        this.splitAt(rangeStart)
        this.splitAt(rangeEnd)

        // Update styles for covered spans
        for (const e of this.indexMap) {
            if (e.start >= rangeStart && e.end <= rangeEnd) {
                const prev = this.styles.get(e.id) ?? this.defaultStyle
                this.styles.set(e.id, this.mergeStyle(prev, style))
            }
        }

        // Merge adjacent spans
        const startIdx = this.indexMap.findIndex(e => e.start === rangeStart)
        this.tryMergeAround(Math.max(0, startIdx - 1))
    }

    getStyledRuns(): Array<{ text: string, start: number, end: number, style: PTextStyle, spanId: string }> {
        return this.indexMap.map(e => {
            const span = this.textSpan.get(e.id)!
            const style = this.styles.get(e.id) ?? this.defaultStyle
            return { text: span.text, start: e.start, end: e.end, style, spanId: e.id }
        })
    }

    getIndexMap(): ReadonlyArray<{ id: string, start: number, end: number }> {
        return this.indexMap
    }

    getSpanStyle(spanId: string): PTextStyle | undefined {
        return this.styles.get(spanId)
    }

    // Internal helpers

    private clear() {
        this.textSpan.clear()
        this.styles.clear()
        this.indexMap = []
    }

    private genId(prefix: string) {
        this.idSeq += 1
        return `${prefix}_${this.idSeq}`
    }

    private clamp(n: number, min: number, max: number) {
        return Math.max(min, Math.min(max, n))
    }

    private lastIndexBefore(offset: number): number {
        let idx = -1
        for (let i = 0; i < this.indexMap.length; i++) {
            if (this.indexMap[i].start < offset) idx = i
            else break
        }
        return idx
    }

    private shiftFrom(startIdx: number, delta: number) {
        for (let i = startIdx; i < this.indexMap.length; i++) {
            const e = this.indexMap[i]
            e.start += delta
            e.end += delta
            const span = this.textSpan.get(e.id)!
            span.start = e.start
            span.end = e.end
        }
    }

    private lastSpanStyle(): PTextStyle | undefined {
        if (!this.indexMap.length) return undefined
        const last = this.indexMap[this.indexMap.length - 1]
        return this.styles.get(last.id)
    }

    private getStyleAt(offset: number): PTextStyle | undefined {
        if (!this.indexMap.length) return undefined
        if (offset === this.getLength()) return this.lastSpanStyle()
        const e = this.findEntry(offset)
        return e ? (this.styles.get(e.id) ?? this.defaultStyle) : undefined
    }

    private findEntry(offset: number): { id: string, start: number, end: number } | undefined {
        // offset in [start, end)
        for (const e of this.indexMap) {
            if (offset >= e.start && offset < e.end) return e
        }
        return undefined
    }

    private splitAt(offset: number) {
        if (offset <= 0 || offset >= this.getLength()) return
        const entry = this.findEntry(offset)
        if (!entry) return
        if (offset === entry.start || offset === entry.end) return

        // Split entry into left and right
        const leftId = entry.id
        const leftSpan = this.textSpan.get(leftId)!
        const leftLen = offset - entry.start

        const rightId = this.genId('span')
        const rightText = leftSpan.text.slice(leftLen)
        const rightStart = offset
        const rightEnd = entry.end
        const rightSpan: PTextSpan = { text: rightText, start: rightStart, end: rightEnd }

        // Update left span
        leftSpan.text = leftSpan.text.slice(0, leftLen)
        leftSpan.end = offset

        // Insert right span next to left and copy style
        const idx = this.indexMap.findIndex(e => e.id === entry.id)
        this.textSpan.set(rightId, rightSpan)
        const leftStyle = this.styles.get(leftId) ?? this.defaultStyle
        this.styles.set(rightId, this.cloneStyle(leftStyle))
        this.indexMap.splice(idx + 1, 0, { id: rightId, start: rightStart, end: rightEnd })
    }

    private tryMergeAround(fromIdx: number) {
        if (this.indexMap.length < 2) return
        let i = Math.max(0, fromIdx)
        while (i < this.indexMap.length - 1) {
            const a = this.indexMap[i]
            const b = this.indexMap[i + 1]
            const aStyle = this.styles.get(a.id) ?? this.defaultStyle
            const bStyle = this.styles.get(b.id) ?? this.defaultStyle
            if (this.isStyleEqual(aStyle, bStyle)) {
                // Merge b into a
                const aSpan = this.textSpan.get(a.id)!
                const bSpan = this.textSpan.get(b.id)!
                aSpan.text = aSpan.text + bSpan.text
                aSpan.end = b.end
                a.end = b.end

                // Remove b
                this.textSpan.delete(b.id)
                this.styles.delete(b.id)
                this.indexMap.splice(i + 1, 1)
                // Continue without increment to check further merges
            } else {
                i++
            }
        }
    }

    private mergeStyle(base: PTextStyle, patch?: Partial<PTextStyle>): PTextStyle {
        if (!patch) return this.cloneStyle(base)
        // Merge nested fills/strokes shallowly; adjust as needed
        return {
            ...base,
            ...patch,
            textFill: patch.textFill ? { ...base.textFill, ...patch.textFill } : base.textFill,
            textStroke: patch.textStroke ? { ...(base.textStroke ?? {}), ...patch.textStroke } : base.textStroke,
            backgroundColor: patch.backgroundColor
                ? { ...(base.backgroundColor ?? {}), ...patch.backgroundColor }
                : base.backgroundColor,
            backgroundStroke: patch.backgroundStroke
                ? { ...(base.backgroundStroke ?? {}), ...patch.backgroundStroke }
                : base.backgroundStroke,
            fontFamilies: patch.fontFamilies ?? base.fontFamilies,
            fontVariations: patch.fontVariations ?? base.fontVariations,
        }
    }

    private cloneStyle(s: PTextStyle): PTextStyle {
        // Cheap deep clone
        return JSON.parse(JSON.stringify(s))
    }

    private isStyleEqual(a: PTextStyle, b: PTextStyle): boolean {
        // Simple structural equality for now
        return JSON.stringify(a) === JSON.stringify(b)
    }
}

export default TextEditor