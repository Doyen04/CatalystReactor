import EventQueue, { EventTypes } from "./EventQueue";

const { PointerDown, PointerMove, PointerUp, PointerDrag, CreateSurface, KeyDown, KeyUp } = EventTypes

class InputManager {
    private canvasEl: HTMLCanvasElement
    private isPointerDown: boolean;
    private isDragging: boolean;
    private dragStart: Coords;

    private boundOnPointerDown: (e: MouseEvent) => void;
    private boundOnPointerMove: (e: MouseEvent) => void;
    private boundOnPointerUp: (e: MouseEvent) => void;
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundOnKeyUp: (e: KeyboardEvent) => void;
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
        this.boundOnKeyUp = this.onKeyUp.bind(this)
        this.boundResize = this.resize.bind(this);

        // Bind events
        this.canvasEl.addEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.addEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.addEventListener('mouseup', this.boundOnPointerUp);
        window.addEventListener('keydown', this.boundOnKeyDown)
        window.addEventListener('keyup', this.boundOnKeyUp);
        window.addEventListener('resize', this.boundResize);
    }

    onPointerDown(e: MouseEvent) {console.log('down');
    
        this.isPointerDown = true
        this.dragStart = { x: e.offsetX, y: e.offsetY }
        EventQueue.trigger(PointerDown, this.dragStart, e)
    }

    onPointerMove(e: MouseEvent) {console.log('move');
        if (this.isPointerDown) {
            EventQueue.trigger(PointerDrag, this.dragStart, e)
        } else {
            EventQueue.trigger(PointerMove, this.dragStart, e)
        }

    }

    onPointerUp(e: MouseEvent) {console.log('up');
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
        //     this.startLoop();
        // }, 0);
    }

    removeEventListeners() {
        this.canvasEl.removeEventListener('mousedown', this.boundOnPointerDown);
        this.canvasEl.removeEventListener('mousemove', this.boundOnPointerMove);
        this.canvasEl.removeEventListener('mouseup', this.boundOnPointerUp);
        window.removeEventListener('keydown', this.boundOnKeyDown)
        window.removeEventListener('keyup', this.boundOnKeyUp);
        window.removeEventListener('resize', this.boundResize);
    }
}

export default InputManager;