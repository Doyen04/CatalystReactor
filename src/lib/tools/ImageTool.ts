import { Coord } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import { useImageStore } from "@hooks/imageStore";

const { CreateScene, DrawScene, UpdateModifierHandlesPos, Render } = EventTypes

class ImageTool extends Tool {

    override handlePointerDown(dragStart: Coord, e: MouseEvent) {
        const { hasImages, selectedImageFiles } = useImageStore.getState();
        console.log(selectedImageFiles.length, 'selectedImageFiles');
        
        if (!hasImages()) {
            console.warn('No images available. Please select images first.');
            return;
        }

        EventQueue.trigger(CreateScene, 'img', dragStart.x, dragStart.y)
    }
    override handlePointerDrag(dragStart: Coord, e: MouseEvent): void {
        if (this.createdScene) {
            EventQueue.trigger(DrawScene, dragStart, e.offsetX, e.offsetY, e.shiftKey)
        }
        EventQueue.trigger(UpdateModifierHandlesPos)
        EventQueue.trigger(Render)
    }
    override handlePointerUp(dragStart: Coord, e: MouseEvent): void {

        const { clearSelectedImage, hasNoImages } = useImageStore.getState();
        if (hasNoImages()) {
            clearSelectedImage();
            console.log('Image placement completed, clearing image store');
            
        }
        super.handlePointerUp?.(dragStart, e);
    }

    override handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            const { clearSelectedImage } = useImageStore.getState();
            clearSelectedImage();
            console.log('Image placement cancelled, clearing image store');
        }
    }
    override handleKeyUp(e: KeyboardEvent): void {

    }
    override cleanUp(): void {
        const { clearSelectedImage } = useImageStore.getState();
        clearSelectedImage();

        super.cleanUp()
        console.log('ImageTool cleaned up');
        
    }
}

export default ImageTool;