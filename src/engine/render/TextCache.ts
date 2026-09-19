import type { Paragraph } from 'canvaskit-wasm'

interface CachedParagraph {
    paragraph: Paragraph | null
    version: number
    width: number
}

export class TextCache {
    private cache = new Map<string, CachedParagraph>()

    getParagraph(id: string, version: number, width: number, build: () => Paragraph): Paragraph {
        const entry = this.cache.get(id)
        if (entry && entry.paragraph !== null && entry.version === version && entry.width === width) {
            return entry.paragraph
        }

        const paragraph = build()
        if (entry) {
            this.deleteParagraph(entry.paragraph)
        }
        this.cache.set(id, { paragraph, version, width })
        return paragraph
    }

    invalidate(id: string): void {
        const entry = this.cache.get(id)
        if (!entry) return
        this.deleteParagraph(entry.paragraph)
        entry.paragraph = null
    }

    delete(id: string): void {
        this.invalidate(id)
        this.cache.delete(id)
    }

    get size(): number {
        return this.cache.size
    }

    dispose(): void {
        for (const entry of this.cache.values()) {
            this.deleteParagraph(entry.paragraph)
        }
        this.cache.clear()
    }

    private deleteParagraph(paragraph: Paragraph | null): void {
        if (!paragraph) return
        try {
            paragraph.delete()
        } catch (error) {
            console.warn('TextCache: failed to delete a paragraph', error)
        }
    }
}

export const textCache = new TextCache()
