import { Matrix3x3Helpers } from "canvaskit-wasm";


const transformWorldToLocal = (Matrix: Matrix3x3Helpers,inverseMatrix: number[], point: { x: number; y: number }): { x: number; y: number } => {
    // Transform the point through the local matrix to get world coordinates
    const transformedPoint = Matrix.mapPoints(inverseMatrix, [point.x, point.y]);
    return {
        x: transformedPoint[0],
        y: transformedPoint[1]
    };
}


export default transformWorldToLocal