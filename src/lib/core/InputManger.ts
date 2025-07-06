
class InputManager{
    canvasEl: HTMLCanvasElement

    private boundOnPointerDown: (e: MouseEvent) => void;
    private boundOnPointerMove: (e: MouseEvent) => void;
    private boundOnPointerUp: (e: MouseEvent) => void;
    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private boundResize: (e?: Event) => void;


    constructor(cnvs: HTMLCanvasElement){
        this.canvasEl = cnvs

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

    onPointerDown(e:Event){

    }

    onPointerMove(e:Event){

    }
    onPointerUp(e:Event){

    }
    onKeyDown(){

    }
    resize(e?:Event){

    }
}

export default InputManager;