export class FrameScheduler {
    private dirty = false
    private rafId: number | null = null
    private running = false
    private frame: () => void

    constructor(frame: () => void) {
        this.frame = frame
    }

    request(): void {
        this.dirty = true
        if (this.rafId !== null || !this.running) return
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null
            if (!this.dirty) return
            this.dirty = false
            this.frame()
        })
    }

    start(): void {
        this.running = true
        this.request()
    }

    stop(): void {
        this.running = false
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
    }

    get isRunning(): boolean {
        return this.running
    }
}
