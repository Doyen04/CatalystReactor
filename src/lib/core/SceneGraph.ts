import Matrix from './Matrix';
import { IShape } from '@lib/types/shapes';

class SceneNode {
    shape: IShape | null;
    children: SceneNode[];
    parent: SceneNode | null;
    localMatrix: Matrix;
    worldMatrix: Matrix;

    constructor(shape: IShape | null = null) {
        this.shape = shape;
        this.children = []
        this.parent = null
        this.localMatrix = Matrix.identity()
        this.worldMatrix = Matrix.identity()
    }

    addChildNode(child: SceneNode): void {
        child.parent = this
        this.children.push(child)
    }

    isCollide(x: number, y: number): boolean {
        return this.shape.pointInShape(x, y)
    }

    removeChildNode(child: SceneNode): void {
        const i = this.children.indexOf(child)
        if (i !== -1) {
            child.parent = null
            this.children.splice(i, 1)
        }
    }

    getShape(): IShape {
        return this.shape
    }

    hasShape(): boolean {
        return this.shape != null
    }

    setLocalMatrix(matrix: Matrix) {
        this.localMatrix = matrix
    }

    updateWorldMatrix(parentWorld = Matrix.identity()) {
        // Compute world = parent × local
        this.worldMatrix = parentWorld.multiply(this.localMatrix)

        // Recurse
        for (const c of this.children) {
            c.updateWorldMatrix(this.worldMatrix)
        }
    }
    destroy() {

    }
}

export default SceneNode;