import { useToolStore } from "@hooks/useTool";
import ModifierManager from "@lib/core/ModifierManager";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";
import { Coord } from "@lib/types/shapes";

abstract class Tool {
    sceneManager: SceneManager | null = null;
    shapeManager: ShapeManager | null = null
    modifierManager: ModifierManager | null = null

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, modifierManager: ModifierManager) {
        this.sceneManager = sceneManager
        this.shapeManager = shapeManager
        this.modifierManager = modifierManager
    }
    handlePointerUp(coord: Coord, e: MouseEvent) {
        this.shapeManager.handleTinyShapes()
        this.modifierManager.update()
        const { setDefaultTool } = useToolStore.getState()
        setDefaultTool()
    }
    handleTextKey(e: KeyboardEvent): void {

    };
    handleArrowKeys(e: KeyboardEvent): void {

    };
    handleEnter(e: KeyboardEvent): void {

    };
    handleDelete(e: KeyboardEvent): void {

    }

    handlePointerMove(dragStart: Coord, e: MouseEvent): void {

    };
    abstract handlePointerDrag(dragStart: Coord, e: MouseEvent): void;
    abstract handlePointerDown(dragStart: Coord, e: MouseEvent): void;

    toolChange(): void {
        console.log('tool changed');
    }
}

export default Tool;