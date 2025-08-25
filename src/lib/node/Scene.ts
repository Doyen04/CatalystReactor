import { Coord, IShape } from '@lib/types/shapes'
import { Canvas } from 'canvaskit-wasm'

interface SceneNode {
    shape: IShape
    parent: SceneNode | null
    localMatrix: number[] | null
    worldMatrix: number[] | null
    draw(ctx: Canvas): void
    setParent(parent: SceneNode): void
    isCollide(x: number, y: number): boolean
    updateWorldMatrix(matrix: number[]): void
    removeChildNode?(child: SceneNode): void
    addChildNode?(child: SceneNode): void
    drawOnDrag(dragStart: Coord, e: MouseEvent): void
    getShape(): IShape
    move(x: number, y: number): void
    getWorldMatrix(): number[]
    getLocalMatrix(): number[]
    drawDefault(): void
    setFlip(x:boolean, y:boolean): void
    destroy(): void
}

export default SceneNode
