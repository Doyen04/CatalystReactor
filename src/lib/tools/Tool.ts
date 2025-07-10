
abstract class Tool {
    abstract handlePointerDown(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerUp(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerMove(dragStart: Coords, e: MouseEvent): void;
    abstract handlePointerDrag(dragStart: Coords, e: MouseEvent): void;
    abstract handleKeyDown(e: KeyboardEvent): void;
    abstract handleKeyUp(e: KeyboardEvent): void;
}

export default Tool;