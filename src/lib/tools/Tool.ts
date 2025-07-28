import { useToolStore } from "@hooks/useTool";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";
import { Coord } from "@lib/types/shapes";

abstract class Tool {
    sceneManager: SceneManager | null = null;
    shapeManager: ShapeManager | null = null

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager) {
        this.sceneManager = sceneManager
        this.shapeManager = shapeManager
    }
    handlePointerUp(coord: Coord, e: MouseEvent) {
        this.shapeManager.handleTinyShapes()
        const { setDefaultTool } = useToolStore.getState()
        setDefaultTool()
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