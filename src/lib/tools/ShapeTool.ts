import { ShapeType } from "@lib/types/shapes";
import Tool from "./Tool";
import { Coord } from "@lib/types/shapes";
import ShapeFactory from "@lib/shapes/base/ShapeFactory";
import SceneNode from "@lib/core/SceneGraph";
import SceneManager from "@lib/core/SceneManager";
import ShapeManager from "@lib/core/ShapeManager";
import ModifierManager from "@lib/core/ModifierManager";


class ShapeTool extends Tool {
    shapeType: ShapeType
    constructor(shape: ShapeType, sceneManager: SceneManager, shapeManager:ShapeManager, modifierManager: ModifierManager) {
        super(sceneManager,shapeManager, modifierManager)
        this.shapeType = shape
    }
    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const shape = ShapeFactory.createShape(this.shapeType, { x: e.offsetX, y: e.offsetY });
        if (shape) {
            const scene: SceneNode = new SceneNode();
            scene.shape = shape
            this.sceneManager.addNode(scene);
            this.shapeManager.attachShape(shape)
            this.modifierManager.attachShape(shape)
        }
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        this.shapeManager.drawShape(dragStart, e)
        this.modifierManager.update()
    };

    setShape(shape: ShapeType) {
        this.shapeType = shape
    }
}

export default ShapeTool;