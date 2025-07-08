import { SceneNode } from "@/lib/core";
import { Rectangle, Oval, Star, Polygon } from "@/lib/shapes";
import type { Shape } from "@/lib/shapes";


export default class ShapeFactory {
    static createShape(type: ShapeType, options: ShapeOptions): SceneNode {
        let shape: Shape;

        switch (type) {
            case "rect":
                shape = new Rectangle(options.x, options.y);
                break;
            case "oval":
                shape = new Oval(options.x, options.y);
                break;
            case "polygon":
                shape = new Polygon(options.x, options.y);
                break;
            case "star":
                shape = new Star(options.x, options.y);
                break;
            default:
                throw new Error(`Unsupported shape type: ${type}`);
        }

        const node: SceneNode = new SceneNode();
        node.shape = shape
        return node
    }
}
