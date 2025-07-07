import { EventQueue, EventTypes } from "@/lib/core";

const { PointerDown, PointerMove, PointerUp , PointerDrag} = EventTypes

class InputManager {
    private canvasEl: HTMLCanvasElement
    private isPointerDown: boolean;
    private isDragging: boolean;
    private dragStart: Coords;

    private boundOnPointerDown: (e: MouseEvent) => void;
    private boundOnPointerMove: (e: MouseEvent) => void;
    private boundOnPointerUp: (e: MouseEvent) => void;
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundResize: (e?: Event) => void;

    constructor(cnvs: HTMLCanvasElement) {
        this.canvasEl = cnvs

        this.isPointerDown = false
        this.isDragging = false
        this.dragStart = null

        this.boundOnPointerDown = this.onPointerDown.bind(this);
        this.boundOnPointerMove = this.onPointerMove.bind(this);
        this.boundOnPointerUp = this.onPointerUp.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this)
        this.boundResize = this.resize.bind(this);

        this.resize()

        // Bind events
        this.canvasEl.addEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.addEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.addEventListener('mouseup', this.boundOnPointerUp);
        this.canvasEl.addEventListener('keydown', this.boundOnKeyDown)
        window.addEventListener('resize', this.boundResize);
    }

    onPointerDown(e: MouseEvent) {
        this.isPointerDown = true
        this.dragStart = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(PointerDown, { coord: this.dragStart, e: e })
    }

    onPointerMove(e: MouseEvent) {
        if (this.isPointerDown) {
            EventQueue.trigger(PointerDrag, { coord: this.dragStart, e: e })
        }else {
            EventQueue.trigger(PointerMove, { coord: this.dragStart, e: e })
        }

    }

    onPointerUp(e: MouseEvent) {
        // console.log('up');

        this.isPointerDown = false;

        EventQueue.trigger(PointerUp, { coord: this.dragStart, e: e })
    }

    onKeyDown(e: KeyboardEvent) {

    }

    resize(e?: Event): void {
        console.log("resizing----5----");
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = getComputedStyle(this.canvasEl);
        console.log(width, height);

        this.canvasEl.width = parseInt(width) * dpr;
        this.canvasEl.height = parseInt(height) * dpr; // set canvas height

        this.stopLoop()

        setTimeout(() => {
            this.makeSurface();
            this.startLoop();
        }, 0);
    }

    removeEventListeners() {
        this.canvasEl.removeEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.removeEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.removeEventListener('mouseup', this.boundOnPointerUp);
        this.canvasEl.removeEventListener('keydown', this.boundOnKeyDown)
        window.removeEventListener('resize', this.boundResize);
    }
}

export default InputManager;