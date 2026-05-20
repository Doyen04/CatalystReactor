import Oval from '../primitives/Oval'
import Rectangle from '../primitives/Rect'
import Star from '../primitives/Star'
import Polygon from '../primitives/Polygon'
import PText from '../primitives/PText'
import { Coord, ShapeType, Properties } from '@lib/types/shapes'
import PImage from '../primitives/Image'
import VectorPath from '../primitives/VectorPath'

import type { Image as CanvasKitImage } from 'canvaskit-wasm'
import type Shape from './Shape'
import SimpleRect from '../primitives/SimpleRect'
import EngineStateStore from '@lib/core/EngineStateStore'

export default class ShapeFactory {
    static createShape(type: ShapeType, options: Coord, image?: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer, name:string }): Shape {
        const store = EngineStateStore.getInstance()
        const id = crypto.randomUUID()
        const initialProps = this.getDefaultProperties(type, options)
        const data = store.createShapeData(id, type, initialProps)
        
        let shape: Shape

        switch (type) {
            case 'rect':
                shape = new Rectangle(data)
                break
            case 'plainRect':
                shape = new SimpleRect(data)
                break
            case 'oval':
                shape = new Oval(data)
                break
            case 'polygon':
                shape = new Polygon(data)
                break
            case 'star':
                shape = new Star(data)
                break
            case 'text':
                shape = new PText(data)
                break
            case 'img': {
                shape = new PImage(data, image)
                break
            }
            case 'line':
            case 'path':
            case 'bezier':
                shape = new VectorPath(data)
                break
            default:
                throw new Error(`Unsupported shape type: ${type}`)
        }
        return shape
    }

    private static getDefaultProperties(type: ShapeType, pos: Coord): Properties {
        const defaultStyle = {
            fill: { color: { type: 'solid' as const, color: '#D9D9D9' }, opacity: 1 },
            stroke: { color: { type: 'solid' as const, color: '#000000' }, opacity: 1, width: 1 },
        };

        const props: Properties = {
            transform: {
                x: pos.x,
                y: pos.y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchorPoint: null,
            },
            size: { width: 0, height: 0 },
            style: defaultStyle,
        };

        // Add type-specific defaults
        if (type === 'rect' || type === 'plainRect' || type == 'img') {
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: false };
        } else if (type === 'star') {
            props.spikesRatio = { spikes: 5, ratio: 0.5 };
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: true };
        } else if (type === 'polygon') {
            props.sides = { sides: 5 };
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: true };
        } else if (type === 'oval') {
            props.arcSegment = { startAngle: 0, sweep: 2 * Math.PI, ratio: 0 };
        } else if (type === 'text') {
            props.text = "Double click to edit";
            props.textStyle = {
                textFill: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
                textAlign: 'left',
                fontSize: 18,
                fontWeight: 500,
                fontFamilies: ['Antonio', 'sans-serif'],
                lineHeight: 1.2,
                backgroundColor: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
            };
        } else if (type === 'line') {
            props.pathData = {
                points: [],
                closed: false,
            };
            props.style.stroke.width = 2;
        } else if (type === 'path' || type === 'bezier') {
            props.pathData = {
                points: [],
                closed: false,
            };
            props.style.stroke.width = 2;
        }

        return props;
    }
}
