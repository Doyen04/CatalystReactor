import { Coord } from '@lib/types/shapes'
import Tool from './Tool'
import SceneManager from '@lib/core/SceneManager'
import ShapeManager from '@lib/core/ShapeManager'
import ShapeFactory from '@lib/shapes/base/ShapeFactory'
import SceneNode from '@lib/node/Scene'
import ShapeNode from '@lib/node/ShapeNode'

import type { Image as CanvasKitImage } from 'canvaskit-wasm'
import { FilePicker } from '@/util/fileOpener'
import { loadImage } from '@/util/loadFile'

class ImageTool extends Tool {
    private isLoading: boolean = false
    private imageData: { imageBuffer: ArrayBuffer; name: string }[] | null
    private preloadedImages: Map<string, CanvasKitImage> = new Map()

    constructor(sceneManager: SceneManager, shapeManager: ShapeManager, cnvs: HTMLCanvasElement) {
        super(sceneManager, shapeManager, cnvs)
        console.log('image tool')
        this.imageData = null
        this.isLoading = true

        const openFilePicker = FilePicker({
            accept: 'image/*',
            multiple: true,
            onFileSelect: file => this.handleFileSelect(file),
        })
        openFilePicker()
    }

    handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {
            try {
                const fileData = Array.from(files).map(file => ({
                    url: URL.createObjectURL(file),
                    name: file.name,
                }))

                this.imageData = await loadImage(fileData)
                console.log(this.imageData, 'images loaded')

                // Clean up URLs
                fileData.forEach(item => URL.revokeObjectURL(item.url))

                await this.preloadSelectedImages()
            } catch (error) {
                console.error('Error loading images:', error)
                this.isLoading = false
            }
        } else {
            console.log('No files selected')
            this.isLoading = false
        }
    }

    private async preloadSelectedImages() {
        if (!this.imageData) return

        this.isLoading = true
        console.log('Preloading images...')

        try {
            for (const imageBuffer of this.imageData) {
                const canvasKitImage = this.resource.canvasKit.MakeImageFromEncoded(imageBuffer.imageBuffer)

                if (canvasKitImage) {
                    this.preloadedImages.set(imageBuffer.name, canvasKitImage)
                }
            }
            console.log(`Preloaded ${this.preloadedImages.size} images`)
        } catch (error) {
            console.error('Error preloading images:', error)
        } finally {
            this.isLoading = false
        }
    }

    private getPreloadedImage(): { CanvasKitImage: CanvasKitImage; imageBuffer: ArrayBuffer } | null {
        if (!this.imageData) return null

        const [currentImage, ...rest] = this.imageData
        if (!currentImage) {
            this.imageData = null
            return null
        }
        this.imageData = rest
        const imag = this.preloadedImages.get(currentImage.name)
        return imag ? { CanvasKitImage: imag, imageBuffer: currentImage.imageBuffer } : null
    }

    isImageDataEmpty() {
        return (Array.isArray(this.imageData) && this.imageData.length == 0) || this.imageData == null
    }

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        if (this.isImageDataEmpty()) {
            console.warn('No images available. Please select images first.')
            return
        }

        if (this.isLoading) {
            console.log('Images are still loading, please wait...')
            return
        }

        const preloadedImage = this.getPreloadedImage()
        if (!preloadedImage) {
            console.log('Image not ready yet, ignoring mouse down')
            return
        }

        const scene = this.sceneManager.getContainerNodeUnderMouse(e.offsetX, e.offsetY)
        const { x, y } = scene.worldToLocal(e.offsetX, e.offsetY)

        const shape = ShapeFactory.createShape('img', { x, y }, preloadedImage)

        if (shape) {
            const shapeNode: SceneNode = new ShapeNode(shape)
            scene.addChildNode(shapeNode)
            this.shapeManager.attachNode(shapeNode)
        }
    }
    override handlePointerUp(dragStart: Coord, e: MouseEvent): void {
        if (this.isImageDataEmpty()) {
            this.preloadedImages.clear()
            console.log('Image placement completed, clearing image store')
            super.handlePointerUp(dragStart, e)
        }
        this.shapeManager.handleTinyShapes()
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        if (this.isLoading) return

        this.shapeManager.drawShape(dragStart, e)
    }

    override toolChange(): void {
        this.preloadedImages.clear()
        this.imageData = null
        this.isLoading = false
        console.log('imageTool Cleaned', this.imageData) //clean images
        super.toolChange()
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
