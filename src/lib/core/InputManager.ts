import EventQueue, { EventTypes } from './EventQueue'

const { PointerDown, PointerMove, PointerUp, CreateSurface, KeyDown, KeyUp } = EventTypes

class InputManager {
    private canvasEl: HTMLCanvasElement

    constructor(cnvs: HTMLCanvasElement) {
        this.canvasEl = cnvs

        // Bind events
        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEventListeners()
        this.addEventListeners()
    }
    addEventListeners() {
        this.canvasEl.addEventListener('mousedown', this.onPointerDown.bind(this))
        this.canvasEl.addEventListener('mousemove', this.onPointerMove.bind(this))
        this.canvasEl.addEventListener('mouseup', this.onPointerUp.bind(this))
        this.canvasEl.addEventListener('keydown', this.onKeyDown.bind(this))
        this.canvasEl.addEventListener('keyup', this.onKeyUp.bind(this))
        window.addEventListener('resize', this.resize.bind(this))
    }

    onPointerDown(e: MouseEvent) {
        console.log('down')
        this.canvasEl.focus()
        EventQueue.trigger(PointerDown, e)
    }

    onPointerMove(e: MouseEvent) {
        EventQueue.trigger(PointerMove, e)
    }

    onPointerUp(e: MouseEvent) {
        console.log('up')
        EventQueue.trigger(PointerUp, e)
    }

    onKeyDown(e: KeyboardEvent) {
        console.log('e down')

        EventQueue.trigger(KeyDown, e)
    }

    onKeyUp(e: KeyboardEvent) {
        console.log('e up')

        EventQueue.trigger(KeyUp, e)
    }

    resize(e?: Event): void {
        console.log('resizing----5----', e)

        EventQueue.trigger(CreateSurface)
    }

    removeEventListeners() {
        this.canvasEl.removeEventListener('mousedown', this.onPointerDown.bind(this))
        this.canvasEl.removeEventListener('mousemove', this.onPointerMove.bind(this))
        this.canvasEl.removeEventListener('mouseup', this.onPointerUp.bind(this))
        window.removeEventListener('keydown', this.onPointerUp.bind(this))
        window.removeEventListener('keyup', this.onKeyUp.bind(this))
        window.removeEventListener('resize', this.resize.bind(this))
    }
    destroy() {
        this.removeEventListeners()
        this.canvasEl = null
    }
}

export default InputManager
