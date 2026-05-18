/** Callback signatures for direct input subscribers */
export interface InputCallbacks {
    onPointerDown?: (e: MouseEvent) => void
    onPointerMove?: (e: MouseEvent) => void
    onPointerUp?: (e: MouseEvent) => void
    onKeyDown?: (e: KeyboardEvent) => void
    onKeyUp?: (e: KeyboardEvent) => void
    onResize?: () => void
}

class InputManager {
    private canvasEl: HTMLCanvasElement

    // Direct subscribers — replaces the EventQueue for 1:1 input routing
    private subscribers: Set<InputCallbacks> = new Set()

    constructor(cnvs: HTMLCanvasElement) {
        this.canvasEl = cnvs

        this.setUpEvent()
    }

    /** Register a direct input subscriber (e.g. ToolManager, Renderer) */
    subscribe(callbacks: InputCallbacks): void {
        this.subscribers.add(callbacks)
    }

    /** Remove a previously registered subscriber */
    unsubscribe(callbacks: InputCallbacks): void {
        this.subscribers.delete(callbacks)
    }

    setUpEvent() {
        this.removeEventListeners()
        this.addEventListeners()
    }

    addEventListeners() {
        this.canvasEl.addEventListener('mousedown', this.onPointerDown)
        this.canvasEl.addEventListener('mousemove', this.onPointerMove)
        this.canvasEl.addEventListener('mouseup', this.onPointerUp)
        this.canvasEl.addEventListener('keydown', this.onKeyDown)
        this.canvasEl.addEventListener('keyup', this.onKeyUp)
        window.addEventListener('resize', this.onResize)
    }

    removeEventListeners() {
        this.canvasEl.removeEventListener('mousedown', this.onPointerDown)
        this.canvasEl.removeEventListener('mousemove', this.onPointerMove)
        this.canvasEl.removeEventListener('mouseup', this.onPointerUp)
        this.canvasEl.removeEventListener('keydown', this.onKeyDown)
        this.canvasEl.removeEventListener('keyup', this.onKeyUp)
        window.removeEventListener('resize', this.onResize)
    }

    // Arrow properties ensure a stable `this` reference without .bind()
    private onPointerDown = (e: MouseEvent) => {
        this.canvasEl.focus()
        this.subscribers.forEach(sub => sub.onPointerDown?.(e))
    }

    private onPointerMove = (e: MouseEvent) => {
        this.subscribers.forEach(sub => sub.onPointerMove?.(e))
    }

    private onPointerUp = (e: MouseEvent) => {
        this.subscribers.forEach(sub => sub.onPointerUp?.(e))
    }

    private onKeyDown = (e: KeyboardEvent) => {
        this.subscribers.forEach(sub => sub.onKeyDown?.(e))
    }

    private onKeyUp = (e: KeyboardEvent) => {
        this.subscribers.forEach(sub => sub.onKeyUp?.(e))
    }

    private onResize = () => {
        this.subscribers.forEach(sub => sub.onResize?.())
    }

    destroy() {
        this.removeEventListeners()
        this.subscribers.clear()
        this.canvasEl = null
    }
}

export default InputManager


