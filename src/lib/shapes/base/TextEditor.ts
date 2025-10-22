import { PTextSpan, PTextStyle } from "@lib/types/shapes"

class TextEditor {
    // Fast lookup for spans by id
    private textSpan: Map<string, PTextSpan>;
    // Style definitions by style id
    private styles: Map<string, PTextStyle>;
    // Span id -> style id
    private spanStyle: Map<string, string>;
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
        this.spanStyle = new Map()
        this.indexMap = []
        this.styles.set('default', this.defaultStyle)
    }

    // Public API

    setText(text: string, styleId: string = 'default') {
        this.clear()
        if (!this.styles.has(styleId)) this.styles.set(styleId, this.defaultStyle)
        const id = this.genId('span')
        const span: PTextSpan = { text, start: 0, end: text.length }
        this.textSpan.set(id, span)
        this.indexMap.push({ id, start: 0, end: text.length })
        this.spanStyle.set(id, styleId)
        return id
    }

    getText(): string {
        return this.indexMap.map(e => this.textSpan.get(e.id)?.text ?? '').join('')
    }

    getLength(): number {
        return this.indexMap.length ? this.indexMap[this.indexMap.length - 1].end : 0
    }

    insertText(offset: number, text: string, styleId?: string) {
        offset = this.clamp(offset, 0, this.getLength())
        const styleToUse = styleId ?? this.styleIdAt(offset) ?? 'default'
        if (!this.styles.has(styleToUse)) this.styles.set(styleToUse, this.defaultStyle)

        if (offset === this.getLength()) {
            // append
            const id = this.genId('span')
            const start = offset
            const end = start + text.length
            const span: PTextSpan = { text, start, end }
            this.textSpan.set(id, span)
            this.spanStyle.set(id, styleToUse)
            this.indexMap.push({ id, start, end })
            return id
        }

        // Split at insertion boundary to avoid mid-span insertion
        this.splitAt(offset)

        // Find insertion index (span that starts at offset)
        const insertIdx = this.indexMap.findIndex(e => e.start === offset)
        const id = this.genId('span')
        const entryBefore = this.indexMap[insertIdx - 1]
        const start = entryBefore ? entryBefore.end : 0
        const end = start + text.length
        const span: PTextSpan = { text, start, end }
        this.textSpan.set(id, span)
        this.spanStyle.set(id, styleToUse)

        // Insert into indexMap
        this.indexMap.splice(insertIdx, 0, { id, start, end })

        // Shift subsequent ranges
        this.shiftFrom(insertIdx + 1, text.length)

        // Merge with neighbors if same style
        this.tryMergeAround(Math.max(0, insertIdx - 1))
        return id
    }

    deleteRange(start: number, end: number) {
        const len = this.getLength()
        start = this.clamp(start, 0, len)
        end = this.clamp(end, 0, len)
        if (start >= end) return

        // Create clean boundaries
        this.splitAt(end)
        this.splitAt(start)

        // Remove all spans fully inside [start, end)
        let i = 0
        while (i < this.indexMap.length) {
            const e = this.indexMap[i]
            if (e.start >= start && e.end <= end) {
                this.textSpan.delete(e.id)
                this.spanStyle.delete(e.id)
                this.indexMap.splice(i, 1)
            } else {
                i++
            }
        }

        // Shift subsequent
        const removed = end - start
        const shiftIdx = this.indexMap.findIndex(e => e.start >= end)
        if (shiftIdx !== -1) {
            this.shiftFrom(shiftIdx, -removed)
        }

        // Fix start/end for the last span before 'end' if it touches start<end
        const beforeIdx = this.lastIndexBefore(start)
        if (beforeIdx !== -1) {
            const e = this.indexMap[beforeIdx]
            const span = this.textSpan.get(e.id)!
            // Clip to start
            const keepLen = start - e.start
            span.text = span.text.slice(0, keepLen)
            span.end = start
            e.end = start
        }

        // Merge neighbors
        this.tryMergeAround(Math.max(0, beforeIdx - 1))
    }

    applyStyle(rangeStart: number, rangeEnd: number, style: string | Partial<PTextStyle>) {
        const len = this.getLength()
        rangeStart = this.clamp(rangeStart, 0, len)
        rangeEnd = this.clamp(rangeEnd, 0, len)
        if (rangeStart >= rangeEnd) return

        let styleId: string
        if (typeof style === 'string') {
            styleId = style
            if (!this.styles.has(styleId)) throw new Error(`Unknown style id: ${styleId}`)
        } else {
            styleId = this.genId('style')
            this.styles.set(styleId, { ...this.defaultStyle, ...style })
        }

        // Create boundaries at range edges
        this.splitAt(rangeStart)
        this.splitAt(rangeEnd)

        // Apply to covered spans
        for (const e of this.indexMap) {
            if (e.start >= rangeStart && e.end <= rangeEnd) {
                this.spanStyle.set(e.id, styleId)
            }
        }

        // Merge adjacent spans where possible
        const startIdx = this.indexMap.findIndex(e => e.start === rangeStart)
        this.tryMergeAround(Math.max(0, startIdx - 1))
    }

    defineStyle(styleId: string, style: PTextStyle) {
        this.styles.set(styleId, style)
    }

    getStyle(styleId: string): PTextStyle | undefined {
        return this.styles.get(styleId)
    }

    getStyledRuns(): Array<{ text: string, start: number, end: number, style: PTextStyle, styleId: string }> {
        return this.indexMap.map(e => {
            const span = this.textSpan.get(e.id)!
            const styleId = this.spanStyle.get(e.id) ?? 'default'
            const style = this.styles.get(styleId) ?? this.defaultStyle
            return { text: span.text, start: e.start, end: e.end, style, styleId }
        })
    }

    getIndexMap(): ReadonlyArray<{ id: string, start: number, end: number }> {
        return this.indexMap
    }

    // Internal helpers

    private clear() {
        this.textSpan.clear()
        this.spanStyle.clear()
        this.indexMap = []
    }

    private genId(prefix: string) {
        this.idSeq += 1
        return `${prefix}_${this.idSeq}`
        // ...existing code...
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

    private styleIdAt(offset: number): string | undefined {
        if (this.indexMap.length === 0) return undefined
        if (offset === this.getLength()) {
            const last = this.indexMap[this.indexMap.length - 1]
            return this.spanStyle.get(last.id)
        }
        const e = this.findEntry(offset)
        return e ? this.spanStyle.get(e.id) : undefined
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

        // Insert right span next to left
        const idx = this.indexMap.findIndex(e => e.id === entry.id)
        this.textSpan.set(rightId, rightSpan)
        const styleId = this.spanStyle.get(leftId) ?? 'default'
        this.spanStyle.set(rightId, styleId)
        this.indexMap.splice(idx + 1, 0, { id: rightId, start: rightStart, end: rightEnd })

        // Ensure following spans keep positions (no net shift here)
    }

    private tryMergeAround(fromIdx: number) {
        if (this.indexMap.length < 2) return
        let i = Math.max(0, fromIdx)
        while (i < this.indexMap.length - 1) {
            const a = this.indexMap[i]
            const b = this.indexMap[i + 1]
            const aStyle = this.spanStyle.get(a.id)
            const bStyle = this.spanStyle.get(b.id)
            if (aStyle === bStyle) {
                // Merge b into a
                const aSpan = this.textSpan.get(a.id)!
                const bSpan = this.textSpan.get(b.id)!
                aSpan.text = aSpan.text + bSpan.text
                aSpan.end = b.end
                a.end = b.end

                // Remove b
                this.textSpan.delete(b.id)
                this.spanStyle.delete(b.id)
                this.indexMap.splice(i + 1, 1)
                // Continue without increment to check further merges
            } else {
                i++
            }
        }
    }
}

export default TextEditor