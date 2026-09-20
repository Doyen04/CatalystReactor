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
import type EngineStateStore from '@lib/core/EngineStateStore'
import type PaintManager from '@lib/core/PaintManager'
import type { ShapeData } from '@lib/core/EngineStateStore'

export default class ShapeFactory {
    static createShapeFromData(
        data: ShapeData,
        paintManager: PaintManager,
        image?: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer; name: string }
    ): Shape {
        let shape: Shape

        switch (data.type) {
            case 'rect':
                shape = new Rectangle(data, paintManager)
                break
            case 'plainRect':
                shape = new SimpleRect(data, paintManager)
                break
            case 'oval':
                shape = new Oval(data, paintManager)
                break
            case 'polygon':
                shape = new Polygon(data, paintManager)
                break
            case 'star':
                shape = new Star(data, paintManager)
                break
            case 'text':
                shape = new PText(data, paintManager)
                break
            case 'img': {
                shape = new PImage(data, paintManager, image)
                break
            }
            case 'line':
            case 'path':
            case 'bezier':
                shape = new VectorPath(data, paintManager)
                break
            default:
                throw new Error(`Unsupported shape type: ${data.type}`)
        }
        return shape
    }

    static createShape(
        type: ShapeType,
        options: Coord,
        paintManager: PaintManager,
        store: EngineStateStore,
        image?: { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer; name: string }
    ): Shape {
        const id = crypto.randomUUID()
        const initialProps = this.getDefaultProperties(type, options)
        const data = store.createShapeData(id, type, initialProps)
        return this.createShapeFromData(data, paintManager, image)
    }

    private static getDefaultProperties(type: ShapeType, pos: Coord): Properties {
        const defaultStyle = {
            fill: { color: { type: 'solid' as const, color: '#D9D9D9' }, opacity: 1 },
            stroke: { color: { type: 'solid' as const, color: '#000000' }, opacity: 1, width: 1 },
        }

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
        }

        if (type === 'rect' || type === 'plainRect' || type == 'img') {
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: false }
        } else if (type === 'star') {
            props.spikesRatio = { spikes: 5, ratio: 0.5 }
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: true }
        } else if (type === 'polygon') {
            props.sides = { sides: 5 }
            props.borderRadius = { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0, locked: true }
        } else if (type === 'oval') {
            props.arcSegment = { startAngle: 0, sweep: 2 * Math.PI, ratio: 0 }
        } else if (type === 'text') {
            props.text = 'Double click to edit'
            props.textStyle = {
                textFill: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
                textAlign: 'left',
                fontSize: 18,
                fontWeight: 500,
                fontFamilies: ['Antonio', 'sans-serif'],
                lineHeight: 1.2,
                backgroundColor: { color: { color: [0, 0, 0, 1], type: 'solid' }, opacity: 1 },
            }
        } else if (type === 'line') {
            props.pathData = {
                points: [],
                closed: false,
            }
            props.style.stroke.width = 2
        } else if (type === 'path' || type === 'bezier') {
            props.pathData = {
                points: [],
                closed: false,
            }
            props.style.stroke.width = 2
        }

        return props
    }
}
