import EventQueue, { EventTypes } from "./EventQueue";

const { PointerDown, PointerMove, PointerUp, PointerDrag, CreateSurface, KeyDown, KeyUp } = EventTypes

class InputManager {
    private canvasEl: HTMLCanvasElement
    private isPointerDown: boolean;
    private isDragging: boolean;
    private dragStart: Coords;

    constructor(cnvs: HTMLCanvasElement) {
        this.canvasEl = cnvs

        this.isPointerDown = false
        this.isDragging = false
        this.dragStart = null

        // Bind events
        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEventListeners()
        this.addEventListeners()
    }
    addEventListeners() {
        this.canvasEl.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvasEl.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvasEl.addEventListener('mouseup', this.onPointerUp.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this))
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        window.addEventListener('resize', this.resize.bind(this));

    }

    onPointerDown(e: MouseEvent) {
        console.log('down');

        this.isPointerDown = true
        this.dragStart = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(PointerDown, this.dragStart, e)
    }

    onPointerMove(e: MouseEvent) {
        console.log('move');
        if (this.isPointerDown) {
            EventQueue.trigger(PointerDrag, this.dragStart, e)
        } else {
            EventQueue.trigger(PointerMove, this.dragStart, e)
        }

    }

    onPointerUp(e: MouseEvent) {
        console.log('up');
        this.isPointerDown = false;

        EventQueue.trigger(PointerUp, this.dragStart, e)
    }

    onKeyDown(e: KeyboardEvent) {
        console.log(e);

        EventQueue.trigger(KeyDown, e)
    }

    onKeyUp(e: KeyboardEvent) {
        console.log(e);

        EventQueue.trigger(KeyUp, e)
    }

    resize(e?: Event): void {
        console.log("resizing----5----");

        EventQueue.trigger(CreateSurface)
    }

    removeEventListeners() {
        this.canvasEl.removeEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvasEl.removeEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvasEl.removeEventListener('mouseup', this.onPointerUp.bind(this));
        window.removeEventListener('keydown', this.onPointerUp.bind(this))
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
        window.removeEventListener('resize', this.resize.bind(this));
    }
}

export default InputManager;