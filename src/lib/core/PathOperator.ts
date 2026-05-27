import type { Path as SkPath, PathOp } from 'canvaskit-wasm'
import { CanvasKitResources } from './CanvasKitResource'
import Shape from '../shapes/base/Shape'
import { Coord, PathPoint, Properties } from '@lib/types/shapes'
import VectorPath from '../shapes/primitives/VectorPath'
import { ShapeData } from './EngineStateStore'

export class PathOperator {
    /**
     * Performs a Boolean operation on a set of shapes.
     * The first shape is the base, and subsequent shapes are combined using the operation.
     */
    static combine(shapes: Shape[], op: PathOp): ShapeData | null {
        if (shapes.length < 2) return null

        const ck = CanvasKitResources.getInstance().canvasKit
        let resultPath: SkPath | null = this.getTransformPath(shapes[0])

        if (!resultPath) return null

        for (let i = 1; i < shapes.length; i++) {
            const nextPath = this.getTransformPath(shapes[i])
            if (!nextPath) continue

            const newResult = ck.Path.MakeFromOp(resultPath, nextPath, op)
            
            resultPath.delete()
            nextPath.delete()
            
            if (!newResult) {
                resultPath = null
                break
            }
            resultPath = newResult
        }

        if (!resultPath) return null

        // Convert back to local space and internal data structure
        const bounds = resultPath.getBounds()
        const newPos: Coord = { x: bounds[0], y: bounds[1] }
        
        // Offset path to local (0,0)
        resultPath.transform(ck.Matrix.translated(-newPos.x, -newPos.y))
        
        const pathData = this.skPathToPathData(resultPath)
        resultPath.delete()

        if (!pathData) return null

        // Inherit style from the first shape
        const firstProps = shapes[0].getProperties()
        
        return {
            id: crypto.randomUUID(),
            type: 'path',
            properties: {
                ...structuredClone(firstProps),
                transform: {
                    ...firstProps.transform,
                    x: newPos.x,
                    y: newPos.y,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1
                },
                size: {
                    width: bounds[2] - bounds[0],
                    height: bounds[3] - bounds[1]
                },
                pathData: pathData
            }
        }
    }

    /**
     * Gets a shape's path transformed into world space.
     */
    private static getTransformPath(shape: Shape): SkPath | null {
        const path = shape.getPath()
        if (!path) return null

        const ck = CanvasKitResources.getInstance().canvasKit
        const props = shape.getProperties()
        const trans = props.transform

        // Build transformation matrix
        const matrix = ck.Matrix.identity()
        
        // Order: Translate -> Rotate -> Scale (standard for our engine)
        ck.Matrix.multiply(matrix, matrix, ck.Matrix.translated(trans.x, trans.y))
        
        if (trans.rotation) {
            const center = shape.getCenterCoord()
            ck.Matrix.multiply(matrix, matrix, ck.Matrix.rotated(trans.rotation, center.x, center.y))
        }
        
        if (trans.scaleX !== 1 || trans.scaleY !== 1) {
            ck.Matrix.multiply(matrix, matrix, ck.Matrix.scaled(trans.scaleX, trans.scaleY, 0, 0))
        }

        path.transform(matrix)
        return path
    }

    /**
     * Converts a Skia Path back into our internal PathPoint structure.
     */
    private static skPathToPathData(path: SkPath): { points: PathPoint[], closed: boolean } | null {
        const cmds = path.toCmds()
        const points: PathPoint[] = []
        let closed = false

        let i = 0
        while (i < cmds.length) {
            const verb = cmds[i]
            switch (verb) {
                case 0: // MoveTo
                    points.push({ x: cmds[i+1], y: cmds[i+2] })
                    i += 3
                    break
                case 1: // LineTo
                    points.push({ x: cmds[i+1], y: cmds[i+2] })
                    i += 3
                    break
                case 2: // QuadTo
                    // We convert Quads to Cubics for internal consistency
                    // but for now let's just use the end point as anchor and cp1 as CP
                    points.push({ 
                        x: cmds[i+3], 
                        y: cmds[i+4],
                        cp1: { x: cmds[i+1], y: cmds[i+2] } 
                    })
                    i += 5
                    break
                case 3: // ConicTo (approximate with line or cubic if needed, but Skia ops rarely produce conics for rects/ovals)
                    points.push({ x: cmds[i+3], y: cmds[i+4] })
                    i += 6
                    break
                case 4: // CubicTo
                    // Skia Cubic: [4, cp1x, cp1y, cp2x, cp2y, x, y]
                    // In our model, CP2 of Prev and CP1 of Current form the segment.
                    if (points.length > 0) {
                        const prev = points[points.length - 1]
                        prev.cp2 = { x: cmds[i+1], y: cmds[i+2] }
                    }
                    points.push({ 
                        x: cmds[i+5], 
                        y: cmds[i+6],
                        cp1: { x: cmds[i+3], y: cmds[i+4] }
                    })
                    i += 7
                    break
                case 5: // Close
                    closed = true
                    i += 1
                    break
                default:
                    i++
            }
        }

        if (points.length === 0) return null
        return { points, closed }
    }
}
