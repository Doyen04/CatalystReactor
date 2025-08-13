import { Canvas } from 'canvaskit-wasm';
import Matrix from './Matrix';
import { IShape, Transform } from '@lib/types/shapes';

class SceneNode {
    shape: IShape | null;
    transform: Transform;
    children: SceneNode[];
    parent: SceneNode | null;
    localMatrix: Matrix;
    worldMatrix: Matrix;

    constructor(shape: IShape) {
        this.shape = shape;
        const { x, y } = shape.getCoord()
        this.transform = {
            x: x,
            y: y,
            isFlippedX: false,
            isFlippedY: false,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };
        this.children = []
        this.parent = null
        this.localMatrix = Matrix.identity()
        this.worldMatrix = Matrix.identity()
    }

    setFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        this.transform.isFlippedX = isFlippedX;
        this.transform.isFlippedY = isFlippedY;
    }
    setPosition(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;
        this.shape.setCoord(x, y);
    }
     move(dx: number, dy: number): void {
        this.transform.x += dx;
        this.transform.y += dy;
        this.transform.originalX += dx;
        this.transform.originalY += dy;
        this.shape.setCoord(this.transform.x, this.transform.y);
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
    draw(canvas: Canvas): void {
        canvas.save();
        // this.applyTransformations(canvas);
        this.shape.draw(canvas);
        canvas.restore();
    }
    destroy() {
        if (this.shape) {
            this.parent?.removeChildNode(this)
            this.shape.destroy()
            this.shape = null
        }
        if (this.children.length > 0) {
            this.children.forEach(child => {
                child.parent?.removeChildNode(child)
                child.destroy()
            })
            this.children = []
        }
        if (this.parent) {
            this.parent.destroy()
            this.parent = null
        }
        this.localMatrix = null
        this.worldMatrix = null

    }
}

export default SceneNode;