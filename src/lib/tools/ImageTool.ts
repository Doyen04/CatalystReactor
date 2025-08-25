import { Coord } from '@lib/types/shapes'
import Tool from './Tool'
import { useImageStore } from '@hooks/imageStore'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import SceneNode from '@lib/node/ContainerNode'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'

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
        const shape = ShapeFactory.createShape('img', {
            x: e.offsetX,
            y: e.offsetY,
        })
        if (shape) {
            const scene: SceneNode = new SceneNode()
            scene.shape = shape
            this.sceneManager.addNode(scene)
            this.shapeManager.attachShape(shape)
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
