import { Canvas } from 'canvaskit-wasm';
import { Coord, IShape, Transform } from '@lib/types/shapes';
import CanvasKitResources from './CanvasKitResource';

class SceneNode {
    private shape: IShape | null;
    transform: Transform;
    children: SceneNode[];
    parent: SceneNode | null;
    localMatrix: number[] | null;
    worldMatrix: number[] | null;

    constructor(shape: IShape | null) {
        this.shape = shape;
        this.children = []
        this.parent = null

        if (!shape) return

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
    }
    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }
    drawOnDrag(dragStart: Coord, e: MouseEvent) {
        this.shape.setSize(dragStart, e.offsetX, e.offsetY, e.shiftKey)

        this.updateWorldMatrix();
    }
    setFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        this.transform.isFlippedX = isFlippedX;
        this.transform.isFlippedY = isFlippedY;

        this.updateWorldMatrix();
    }

    setPosition(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;
        this.shape.setCoord(x, y);

        this.updateWorldMatrix();
    }

    move(dx: number, dy: number): void {
        this.transform.x += dx;
        this.transform.y += dy;
        this.transform.originalX += dx;
        this.transform.originalY += dy;
        this.shape.setCoord(this.transform.x, this.transform.y);

        this.updateWorldMatrix();
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

    setLocalMatrix(matrix: number[]) {
        this.localMatrix = matrix
    }

    // Build a local matrix from current transform.
    // Note: shapes already draw in absolute coords (x,y). We rotate/scale around the visual center.
    private recomputeLocalMatrix(): void {
        if (!this.shape) {
            this.localMatrix = this.resource.canvasKit.Matrix.identity();
            return;
        }
        const Matrix = this.resource.canvasKit.Matrix
        const { x, y } = this.transform;
        const { width, height } = this.shape.getDim();

        const pivotX = x + width / 2;
        const pivotY = y + height / 2;

        const sx = (this.transform.isFlippedX ? -1 : 1) * (this.transform.scaleX ?? 1);
        const sy = (this.transform.isFlippedY ? -1 : 1) * (this.transform.scaleY ?? 1);

        const Tpivot = Matrix.translated(pivotX, pivotY);
        const R = Matrix.rotated(this.transform.rotation || 0);
        const S = Matrix.scaled(sx, sy);
        const TnegPivot = Matrix.translated(-pivotX, -pivotY);

        let result = Matrix.identity();
        result = Matrix.multiply(result, Tpivot);
        result = Matrix.multiply(result, R);
        result = Matrix.multiply(result, S);
        result = Matrix.multiply(result, TnegPivot);

        this.localMatrix = result;
    }

    updateWorldMatrix(parentWorld?: number[]) {
        const Matrix = this.resource.canvasKit.Matrix

        const parentMatrix = parentWorld ?? Matrix.identity();

        this.recomputeLocalMatrix();

        this.worldMatrix = Matrix.multiply(parentMatrix, this.localMatrix)

        // Recurse
        for (const c of this.children) {
            c.updateWorldMatrix(this.worldMatrix)
        }
    }

    draw(canvas: Canvas): void {
        canvas.save();
        // canvas.concat(this.localMatrix);

        if (this.shape) this.shape.draw(canvas);
        this.children.forEach(node => node.draw(canvas))
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