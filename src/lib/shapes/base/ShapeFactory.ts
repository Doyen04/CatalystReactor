import  Oval from "../primitives/Oval";
import Rectangle from "../primitives/Rect"
import Star from '../primitives/Star'
import Polygon from '../primitives/Polygon'
import PText from "../primitives/PText";
import { IShape, Coord, ShapeType } from "@lib/types/shapes";
import PImage from "../primitives/Image";


export default class ShapeFactory {
    static createShape(type: ShapeType, options: Coord): IShape {
        let shape: IShape;

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
            case "text":
                shape = new PText(options.x, options.y);
                break;
            case "img":
                shape = new PImage(options.x, options.y);
                break;
            default:
                throw new Error(`Unsupported shape type: ${type}`);
        } 
        return shape
    }
}
