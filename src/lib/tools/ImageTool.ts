import { Coord } from '@lib/types/shapes'
import Tool from './Tool'
import { useImageStore } from '@hooks/imageStore'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneNode from '@lib/node/Scene'
import ShapeNode from '@lib/node/ShapeNode'

class ImageTool extends Tool {
    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
    }

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const { hasImages, selectedImageFiles } = useImageStore.getState()
        console.log(selectedImageFiles.length, 'selectedImageFiles')

        if (!hasImages()) {
            console.warn('No images available. Please select images first.')
            return
        }
        const scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)

        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)
        const shape = ShapeFactory.createShape('img', {
            x,
            y,
        })

        if (shape) {
            const shapeNode: SceneNode = new ShapeNode(shape)
            scene.addChildNode(shapeNode)
            this.shapeManager.attachNode(shapeNode)
        }
    }
    override handlePointerUp(dragStart: Coord, e: MouseEvent): void {
        const { clearSelectedImage, hasNoImages } = useImageStore.getState()
        if (hasNoImages()) {
            clearSelectedImage()
            console.log('Image placement completed, clearing image store')
            super.handlePointerUp?.(dragStart, e)
        }
        this.shapeManager.handleTinyShapes()
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        this.shapeManager.drawShape(dragStart, e)
    }

    // override handleKeyDown(e: KeyboardEvent): void {
    //     if (e.key === 'Escape') {
    //         const { clearSelectedImage } = useImageStore.getState();
    //         clearSelectedImage();
    //         console.log('Image placement cancelled, clearing image store');
    //     }
    // }
    // override handleKeyUp(e: KeyboardEvent): void {

    // }

    // override toolChange(): void {
    //     const { clearSelectedImage } = useImageStore.getState();
    //     clearSelectedImage();

    //     super.toolChange()
    //     console.log('ImageTool cleaned up');

    // }
}

export default ImageTool
