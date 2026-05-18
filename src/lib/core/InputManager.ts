import EventQueue, { EventTypes } from './EventQueue'

const { PointerDown, PointerMove, PointerUp, CreateSurface, KeyDown, KeyUp } = EventTypes

class InputManager {
    private canvasEl: HTMLCanvasElement

    constructor(cnvs: HTMLCanvasElement) {
        this.canvasEl = cnvs

        this.setUpEvent()
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
        EventQueue.trigger(PointerDown, e)
    }

    private onPointerMove = (e: MouseEvent) => {
        EventQueue.trigger(PointerMove, e)
    }

    private onPointerUp = (e: MouseEvent) => {
        EventQueue.trigger(PointerUp, e)
    }

    private onKeyDown = (e: KeyboardEvent) => {
        EventQueue.trigger(KeyDown, e)
    }

    private onKeyUp = (e: KeyboardEvent) => {
        EventQueue.trigger(KeyUp, e)
    }

    private onResize = () => {
        EventQueue.trigger(CreateSurface)
    }

    destroy() {
        this.removeEventListeners()
        this.canvasEl = null
    }
}

export default InputManager

