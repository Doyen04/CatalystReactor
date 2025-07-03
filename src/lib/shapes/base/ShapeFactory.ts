import { CanvasManager, SceneNode } from "@/lib/core";
import { Rectangle, Oval } from "@/lib/shapes";
import type { Shape } from "@/lib/shapes";

type ShapeType = "rectangle" | "oval";

interface ShapeOptions {
    x: number;
    y: number;
}

export default class ShapeFactory {
    static createShape(type: ShapeType, options: ShapeOptions, canvasManager:CanvasManager): void {
        let shape: Shape;

        switch (type) {
            case "rectangle":
                shape = new Rectangle(options.x, options.y);
                break;
            case "oval":
                shape = new Oval(options.x, options.y);
                break;
            default:
                throw new Error(`Unsupported shape type: ${type}`);
        }

        const node: SceneNode = new SceneNode();
        node.shape = shape
        canvasManager.addNode(node);
        canvasManager.activeShape = node;
        canvasManager.dimensionMod.setShape(node.shape)
    }
}
